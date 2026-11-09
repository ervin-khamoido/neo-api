2021

import { inject, injectable, named } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ConfigSymbol, IConfig } from '@ts-awesome/config'
import { readable } from '@ts-awesome/model-reader'
import { alias, of, sum } from '@ts-awesome/orm'

import { subMonths } from 'date-fns'

import { USDC } from '../utils/formatter'
import { floorAmount } from '../utils/calculator-utils'

import {
  OrderModel,
  UserWalletEntityServiceSymbol,
  IUserWalletEntityService,
  IOrderEntityService,
  OrderEntityServiceSymbol,
  OrderType,
  YieldOrderEntityServiceSymbol,
  IYieldOrderEntityService,
  YieldOrderModel,
  IUserEntityService,
  UserEntityServiceSymbol,
  IWalletEntityService,
  WalletEntityServiceSymbol,
  Currency,
  TransactionStatus,
  OrderStatusModel,
  YieldOrderStatus,
  CurrencyType,
  UserModel,
} from '../models/db'

import { AppConfigSymbol, IAppConfig } from '../models/config'
import { YieldOrderWebhookInput } from '../models/webhooks/yield-order.webhook.input'
import { RewardTotalsOutput } from '../models/response'

import { IMailerService, MailerServiceSymbol } from '../lib/services/mailer'

import { IYOStatusService, YOStatusServiceSymbol } from './yo-status.service'
import { ExchangeRateServiceSymbol, IExchangeRateService } from './exchange-rate.service'
import { ActivityServiceSymbol, IActivityService } from './activity/activity.service'
import { IOrderConfigurationService, OrderConfigurationServiceSymbol } from './order-configuration.service'
import { CalculatorServiceSymbol, ICalculatorService } from './calculator.service'
import { ITransactionService, TransactionServiceSymbol } from './transaction/transaction.service'
import { fromModernTreasuryAmount } from './modern-treasury.service'
import { MailTemplates } from './mailer/mailgun.service'
import { IPushService, PushServiceSymbol } from './push.service'
import { IUserBalanceService, UserBalanceServiceSymbol } from './user-balance.service'

export interface IYieldOrderService {
  getYieldTotalsEarned(user: UserModel): Promise<RewardTotalsOutput>

  createYieldOrder(payload: YieldOrderWebhookInput): Promise<[OrderModel, YieldOrderModel]>
}

export const YieldOrderServiceSymbol = Symbol.for('IYieldOrderService')

@injectable()
export class YieldOrderService implements IYieldOrderService {
  @inject(AppConfigSymbol) appConfig!: IAppConfig
  @inject(ConfigSymbol) config!: IConfig

  @inject(UserWalletEntityServiceSymbol) userWalletEntityService!: IUserWalletEntityService
  @inject(YieldOrderEntityServiceSymbol) yieldOrderEntityService!: IYieldOrderEntityService
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(WalletEntityServiceSymbol) walletEntityService!: IWalletEntityService

  @inject(YOStatusServiceSymbol) yoStatusService!: IYOStatusService
  @inject(ExchangeRateServiceSymbol) exchangeRateService!: IExchangeRateService
  @inject(ActivityServiceSymbol) activityService!: IActivityService
  @inject(OrderConfigurationServiceSymbol) orderConfigurationService!: IOrderConfigurationService
  @named('calculatorV2')
  @inject(CalculatorServiceSymbol)
  calculatorService!: ICalculatorService
  @inject(TransactionServiceSymbol) transactionService!: ITransactionService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(PushServiceSymbol) pushService!: IPushService
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(YieldOrderService)
  }

  async getYieldTotalsEarned(user: UserModel): Promise<RewardTotalsOutput> {
    const totalResult = await this.yieldOrderEntityService
      .select()
      .columns(x => [alias(sum(x.amountUsdc), 'amount')])
      .join(OrderModel, (root, other) => root.orderId.eq(other.id))
      .join(OrderStatusModel, (root, other) => root.orderId.eq(other.orderId))
      .where(() => of(OrderModel, 'userId').eq(user.id))
      .where(() => of(OrderStatusModel, 'status').eq(YieldOrderStatus.Completed))
      .fetchOne(TotalUsdc)

    const totalUsdc = totalResult?.amount ?? 0

    const totalUsdcCurrentMonth = await this.userBalanceService.getUserYieldBalance(user.uid)

    return {
      totalEarned: totalUsdc,
      totalEarnedCurrentMonth: totalUsdcCurrentMonth.balance,
      currency: CurrencyType.USD,
      currentMonth: subMonths(totalUsdcCurrentMonth.dueDate, 1).toLocaleString('default', { month: 'long' }),
    }
  }

  async createYieldOrder(payload: YieldOrderWebhookInput): Promise<[OrderModel, YieldOrderModel]> {
    // Retrieve the user and user wallet
    const [user, wallet] = await Promise.all([
      this.userEntityService.getOne({ uid: payload.owner }),
      this.walletEntityService.getOne({ uid: payload.wallet }),
    ])
    if (!user || !wallet) {
      throw new Error('precondition failed: user or wallet not found')
    }

    const userWallet = await this.userWalletEntityService.getOne({ userId: user?.id, walletId: wallet?.id })
    if (!userWallet) {
      throw new Error('precondition failed: wallet does not belong to user')
    }

    // Create the order
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.YieldOrder)
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.YieldOrder,
      referenceNumber: referenceNumber,
      userId: user.id,
    })

    // potential problem with UTC times, we rely on server timezone to be UTC
    const startPeriod = new Date(payload.yieldStartDate)
    const endPeriod = new Date(payload.yieldEndDate)

    const { buyExchangeRate } = await this.exchangeRateService.getExchangeRate(endPeriod)

    const amountUsdc = fromModernTreasuryAmount(payload.amount)
    // Calculate amount NGN
    const amountNgn = await this.calculatorService.convertCurrencyToFiat(amountUsdc, { exchangeRate: buyExchangeRate })

    // Create the yield order
    const yieldOrder = await this.yieldOrderEntityService.addOne({
      orderId: order.id,
      toWalletId: userWallet.walletId,
      from: payload.from,
      amountUsdc: amountUsdc,
      amount: amountNgn,
      exchangeRate: buyExchangeRate,
      averageInterestRate: null,
      code: 'monthly_yield',
      name: 'Monthly Reward',
      startPeriod: startPeriod,
      endPeriod: endPeriod,
      payload: payload,
    })

    // modernTreasuryTransactionId has a unique constraint.
    // We cannot use payload.transactionId directly decause one transaction will
    // be shared between many users.
    const modernTreasuryTransactionId = `${payload.transactionId}:${payload.owner}`
    const createdBy = `yield-processor:${payload.transactionId}`

    // Add the transaction
    await this.transactionService.addTransaction(
      {
        orderId: order.id,
        createdBy: createdBy,
        source: payload.from,
        amount: amountUsdc,
        currency: Currency.USDC,
        dest: payload.to,
      },
      {
        status: TransactionStatus.Completed,
        modernTreasuryTransactionId: modernTreasuryTransactionId,
        modernTreasuryStatus: payload.transactionStatus,
      },
    )

    // Complete the yield order
    await this.yoStatusService.completed(order.id, createdBy)

    // Create the yield order FS activity record
    try {
      if (yieldOrder.amountUsdc >= 0.01) {
        await this.activityService.createYOActivity(user!, order, yieldOrder)

        const flooredAmount = floorAmount(yieldOrder.amountUsdc, 2)
        const formattedAmount = USDC(flooredAmount)
        const month = startPeriod.toLocaleString('default', { month: 'long', timeZone: 'UTC' })
        await this.mailerService.send({
          subject: 'We have credited your interest to your wallet 🎉',
          to: user.email,
          template: {
            name: MailTemplates.YieldReminder,
            variables: {
              yield_amount: formattedAmount,
              month: month,
            },
            conditionalContent: {},
          },
        })

        await this.pushService.send(user, {
          title: `We have credited your interest to your wallet 🎉`,
          body: `Congratulations! We’ve credited your ${month} interest ${formattedAmount} to your Neobank App wallet 🎉.`,
        })
      }
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
    }

    return [order, yieldOrder]
  }
}

class TotalUsdc {
  @readable(Number, true) amount!: number | null
}
