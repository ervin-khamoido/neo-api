import { inject, injectable } from 'inversify'
import {
  IOrderEntityService,
  IOrderStatusEntityService,
  IPurchaseOrderEntityService,
  IUserEntityService,
  IWalletEntityService,
  OrderEntityServiceSymbol,
  OrderStatusEntityServiceSymbol,
  PurchaseOrderEntityServiceSymbol,
  PurchaseOrderModel,
  RewardOrderStatus,
  RewardType,
  UserEntityServiceSymbol,
  UserModel,
  WalletEntityServiceSymbol,
} from '../../models/db'
import { IRewardOrderService, RewardOrderServiceSymbol } from '../reward/reward-order.service'
import { CashbackCalculatorSymbol, ICashbackCalculator } from './cashback-calculator.service'
import { AirtableServiceSymbol, IAirtableService } from '../airtable.service'
import { IMailerService, MailerServiceSymbol, MailTemplates } from '../../lib/services/mailer'
import { ICashbackCalculatorResponse } from '../../models/cashback/cashback-response'
import { ITransactionService, TransactionServiceSymbol } from '../transaction/transaction.service'
import * as crypto from 'crypto'
import {
  IPOCashbackCalculatorConfigService,
  POCashbackCalculatorConfigServiceSymbol,
} from '../po-cashback-calculator-config.service'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IPOStatusService, POStatusServiceSymbol } from '../po-status.service'
import { PERCENTAGE, USDC } from '../../utils/formatter'
import { CashbackConfigServiceSymbol, ICashbackConfigService } from './cashback-config.service'
import { CalculatorServiceSymbol, ICalculatorService } from '../calculator.service'
import { floorAmount } from '../../utils/calculator-utils'

export interface ICashbackService {
  processCashBack(orderId: number): Promise<void>
}

export const CashbackSymbol = Symbol.for('ICashbackService')

@injectable()
export class CashbackService implements ICashbackService {
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService
  @inject(RewardOrderServiceSymbol) rewardOrderService!: IRewardOrderService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(CashbackCalculatorSymbol) cashbackCalculator!: ICashbackCalculator
  @inject(AirtableServiceSymbol) airtableService!: IAirtableService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(TransactionServiceSymbol) transactionService!: ITransactionService
  @inject(PurchaseOrderEntityServiceSymbol) purchaseOrderEntityService!: IPurchaseOrderEntityService
  @inject(POCashbackCalculatorConfigServiceSymbol)
  poCashbackCalculatorConfigService!: IPOCashbackCalculatorConfigService
  @inject(POStatusServiceSymbol) poStatusService!: IPOStatusService
  @inject(CashbackConfigServiceSymbol) cashbackConfigService!: ICashbackConfigService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(CashbackService)
  }

  async processCashBack(orderId: number): Promise<void> {
    const [isCryptoCredited, order, purchaseOrder] = await Promise.all([
      this.poStatusService.isCryptoCredited(orderId),
      this.orderEntityService.getOne({ id: orderId }),
      this.purchaseOrderEntityService.getOne({ orderId: orderId }),
    ])

    if (!isCryptoCredited) {
      throw new Error(`precondition failed: order is not in crypto credited state`)
    }

    if (!order) {
      throw new Error(`precondition failed: order not found`)
    }

    if (!purchaseOrder) {
      throw new Error(`precondition failed: purchase order not found`)
    }

    const user = await this.userEntityService.getOne({ id: order.userId })
    if (!user) {
      throw new Error(`precondition failed: user not found`)
    }

    let config = await this.cashbackConfigService.getConfig()

    await this.poCashbackCalculatorConfigService.create(config, purchaseOrder.orderId)

    const winPercentage = config.winPercentage
    if (winPercentage > 1) {
      throw new Error('precondition failed: winrate cannot be greater than 1')
    }

    const [isEligibleForReward, isEligibleRandomValueGenerated] = await this.isEligibleForReward(winPercentage)

    const loggedExtraDetails = {
      winPercentage,
      isEligibleRandomValueGenerated,
    }

    this.logger.log(`Cashback eligibility decided on`, JSON.stringify(loggedExtraDetails))

    if (!isEligibleForReward) {
      this.logger.log(`order ${order.referenceNumber} is not eligible for cashback`, JSON.stringify(loggedExtraDetails))
      return
    }

    const calculatorResponse = await this.cashbackCalculator.getCashbackValue(
      purchaseOrder.totalUsdc,
      config.maxWinAmountPercentage,
      config.minWinAmountPercentage,
    )

    if (calculatorResponse.cashbackUsdc > config.maxWinAmountValue) {
      calculatorResponse.cashbackUsdc = config.maxWinAmountValue
      calculatorResponse.cashbackPercentage = this.cashbackCalculator.getPercentageValue(
        calculatorResponse.cashbackUsdc,
        purchaseOrder.totalUsdc,
      )
    }

    if (calculatorResponse.cashbackUsdc < 0.01) {
      this.logger.info(
        `user cannot win less that 0.01 USDC`,
        JSON.stringify({ config: { ...config }, ...calculatorResponse }),
      )
      return
    }

    let flooredTotalUsdc = floorAmount(purchaseOrder.totalUsdc, 2)

    await this.rewardOrderService.createRewardOrder({
      title: 'Cashback',
      description: `You just won ${PERCENTAGE(
        calculatorResponse.cashbackPercentage,
      )} cashback bonus on your deposit of ${USDC(flooredTotalUsdc, false)} on Neobank!`,
      user: user,
      rewardType: RewardType.Cashback_Buy,
      amountUsdc: calculatorResponse.cashbackUsdc,
      details: {
        type: RewardType.Cashback_Buy,
        version: 'v1',
        config: { ...config },
        calculatedWinAmountPercentage: calculatorResponse.cashbackPercentage,
        amount: purchaseOrder.amount,
        totalUsdc: purchaseOrder.totalUsdc,
        cashbackUsdc: calculatorResponse.cashbackUsdc,
        isEligibleRandomValueGenerated: isEligibleRandomValueGenerated,
        referenceNumber: order.referenceNumber,
      },
    })

    const currentStatus = await this.orderStatusEntityService.getOne({ orderId: order.id })
    if (currentStatus?.status === RewardOrderStatus.Completed) {
      // TODO: uncomment when notifications are ready
      // try{
      //  await this.sendNotifications(user, calculatorResponse, purchaseOrder)
      // }catch(err: any){
      //   this.logger.warn('unexpected: could not send cashback notification error')
      //   this.logger.error(err)
      // }
    }
  }

  // email template content and email subject will be updated when values are supllied by ops team
  private async sendNotifications(
    user: UserModel,
    cashbackDetails: ICashbackCalculatorResponse,
    purchaseOrder: PurchaseOrderModel,
  ): Promise<void> {
    await this.mailerService.send({
      subject: 'Congratulations, you just won cashback!',
      to: user.email,
      template: {
        name: MailTemplates.CashbackBuy,
        variables: {
          cashback_usdc: cashbackDetails.cashbackUsdc,
          cashback_percentage: cashbackDetails.cashbackPercentage,
          total_usdc: purchaseOrder.totalUsdc,
        },
        conditionalContent: {},
      },
    })
  }

  private async isEligibleForReward(winPercentage: number): Promise<[boolean, number]> {
    let winPercentageAdjusted = winPercentage * 100
    let randomValue = await crypto.randomInt(1, 100)
    let isEligible = randomValue <= winPercentageAdjusted
    return [isEligible, randomValue]
  }
}
