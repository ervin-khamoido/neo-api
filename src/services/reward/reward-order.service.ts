2021

import { inject, injectable, named } from 'inversify'
import { ConfigSymbol, ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { alias, of, sum } from '@ts-awesome/orm'
import { readable } from '@ts-awesome/model-reader'

import { format, lastDayOfMonth } from 'date-fns'

import {
  Currency,
  CurrencyType,
  IOrderEntityService,
  IReferralRewardDetails,
  IRewardOrderEntityService,
  OrderEntityServiceSymbol,
  OrderModel,
  OrderStatusModel,
  OrderType,
  RewardOrderEntityServiceSymbol,
  RewardOrderModel,
  RewardOrderStatus,
  RewardType,
  TransactionModel,
  TransactionStatus,
  TransactionStatusModel,
  UserModel,
} from '../../models/db'
import { ICreateRewardOrderInput } from '../../models/reward'

import { IMailerService, MailerServiceSymbol, MailTemplates } from '../../lib/services/mailer'
import { ExchangeRateServiceSymbol, IExchangeRateService } from '../exchange-rate.service'
import { ActivityServiceSymbol, IActivityService } from '../activity/activity.service'
import { IOrderConfigurationService, OrderConfigurationServiceSymbol } from '../order-configuration.service'
import { CalculatorServiceSymbol, ICalculatorService } from '../calculator.service'
import { ITransactionService, TransactionServiceSymbol } from '../transaction/transaction.service'
import { IPushService, PushServiceSymbol } from '../push.service'
import { IROStatusService, ROStatusServiceSymbol } from '../ro-status.service'
import { IWalletService, WalletServiceSymbol } from '../wallet.service'
import { IModernTreasuryService, ModernTreasuryServiceSymbol } from '../modern-treasury.service'
import { IUserBalanceService, UserBalanceServiceSymbol } from '../user-balance.service'
import { formatUsdcForNotifications, NGN, PERCENTAGE } from '../../utils/formatter'
import { IConfig } from 'config'
import { RewardOrderCashbackDetails } from '../../models/cashback/cashback-details'
import { RewardNotificationFactory, RewardNotificationFactorySymbol } from './notifications/reward-notification.factory'
import { RewardTotalsOutput } from '../../models/response'

export interface IRewardOrderService {
  getTotalsEarnedByRewardType(userId: number, rewardType: RewardType): Promise<RewardTotalsOutput>

  createRewardOrder(payload: ICreateRewardOrderInput): Promise<[OrderModel, RewardOrderModel]>
}

export const RewardOrderServiceSymbol = Symbol.for('IRewardOrderService')

@injectable()
export class RewardOrderService implements IRewardOrderService {
  @inject(RewardOrderEntityServiceSymbol) rewardOrderEntityService!: IRewardOrderEntityService
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService

  @inject(ROStatusServiceSymbol) roStatusService!: IROStatusService
  @inject(ActivityServiceSymbol) activityService!: IActivityService
  @inject(OrderConfigurationServiceSymbol) orderConfigurationService!: IOrderConfigurationService
  @inject(WalletServiceSymbol) walletService!: IWalletService
  @inject(TransactionServiceSymbol) transactionService!: ITransactionService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(PushServiceSymbol) pushService!: IPushService
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService
  @inject(ExchangeRateServiceSymbol) exchangeRateService!: IExchangeRateService
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService
  @named('calculatorV2')
  @inject(CalculatorServiceSymbol)
  calculatorService!: ICalculatorService

  @inject(RewardNotificationFactorySymbol) notificationFactory!: RewardNotificationFactory

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(RewardOrderService)
  }

  async getTotalsEarnedByRewardType(userId: number, rewardType: RewardType): Promise<RewardTotalsOutput> {
    // Get total USDC for all time
    const totalResult = await this.rewardOrderEntityService
      .select()
      .columns(x => [alias(sum(x.amountUsdc), 'amount')])
      .join(OrderModel, (root, other) => root.orderId.eq(other.id))
      .join(OrderStatusModel, (root, other) => root.orderId.eq(other.orderId))
      .where(() => of(OrderModel, 'userId').eq(userId))
      .where(x => x.rewardType.eq(rewardType))
      .where(() => of(OrderStatusModel, 'status').eq(RewardOrderStatus.Completed))
      .fetchOne(TotalUsdc)

    // Get the total USDC for the current month
    const currentDate = new Date()
    const firstDateOfMonth = new Date(format(currentDate, 'yyyy-MM-01'))
    const lastDateOfMonth = new Date(format(lastDayOfMonth(currentDate), 'yyyy-MM-dd'))

    const totalCurrentMonthResult = await this.rewardOrderEntityService
      .select()
      .columns(x => [alias(sum(x.amountUsdc), 'amount')])
      .join(OrderModel, (root, other) => root.orderId.eq(other.id))
      .join(OrderStatusModel, (root, other) => root.orderId.eq(other.orderId))
      .where(() => of(OrderModel, 'userId').eq(userId))
      .where(x => x.rewardType.eq(rewardType))
      .where(() => of(OrderStatusModel, 'status').eq(RewardOrderStatus.Completed))
      .where(() => of(OrderStatusModel, 'updatedAt').between(firstDateOfMonth, lastDateOfMonth))
      .fetchOne(TotalUsdc)

    // Get the totals
    const totalUsdc = totalResult?.amount ?? 0
    const totalUsdcCurrentMonth = totalCurrentMonthResult?.amount ?? 0

    return {
      totalEarned: totalUsdc,
      totalEarnedCurrentMonth: totalUsdcCurrentMonth,
      currency: CurrencyType.USD,
      currentMonth: currentDate.toLocaleString('default', { month: 'long' }),
    }
  }

  async createRewardOrder(payload: ICreateRewardOrderInput): Promise<[OrderModel, RewardOrderModel]> {
    // Retrieve the user wallet
    const userMTWallet = await this.walletService.getMTSavingWallet(payload.user.id)
    if (!userMTWallet) {
      throw new Error('precondition failed: external user wallet not found')
    }

    // Retrieve the system wallet
    const systemWallet = await this.modernTreasuryService.getSystemAccount(userMTWallet.ledgerId)
    if (!systemWallet) {
      throw new Error('unexpected error: could not find external system wallet')
    }

    // Create the order
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.RewardOrder)
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.RewardOrder,
      referenceNumber: referenceNumber,
      userId: payload.user.id,
    })

    const { buyExchangeRate } = await this.exchangeRateService.getExchangeRate(new Date())
    const amountNgn = await this.calculatorService.convertCurrencyToFiat(payload.amountUsdc, {
      exchangeRate: buyExchangeRate,
    })

    // Create the reward order
    const rewardOrder = await this.rewardOrderEntityService.addOne({
      orderId: order.id,
      title: payload.title,
      description: payload.description,
      from: systemWallet.id,
      toWalletId: userMTWallet.walletId,
      amountUsdc: payload.amountUsdc,
      amount: amountNgn,
      exchangeRate: buyExchangeRate,
      rewardType: payload.rewardType,
      details: payload.details,
    })

    // Create the order status
    const createdBy = `reward-service:${payload.user.uid}`
    const orderStatus = await this.roStatusService.created(order.id, createdBy)

    // Create the transaction
    const [transaction, transactionStatusChangeResult] = await this.transactionService.createTransaction({
      orderId: order.id,
      source: systemWallet.id,
      dest: userMTWallet.ledgerAccountId,
      currency: Currency.USDC,
      amount: payload.amountUsdc,
      createdBy: createdBy,
      description: `reward.${rewardOrder.rewardType}`,
    })

    const { transactionStatus, changed } = transactionStatusChangeResult
    if (transactionStatus.status !== TransactionStatus.Pending) {
      await this.roStatusService.failed(order.id, `transaction:${transaction.uid}`)

      this.logger.error(`critical: unexpected transfer status ${transactionStatus.status} for order:${order.uid}`)

      return [order, rewardOrder]
    }

    try {
      const result = await this.transactionService.complete(transactionStatus.transactionId)

      if (result.changed) {
        await this.onTransactionStatusChanged(
          payload.user,
          order,
          orderStatus,
          rewardOrder,
          transaction,
          result.transactionStatus,
        )
      }
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
    }

    return [order, rewardOrder]
  }

  private async onTransactionStatusChanged(
    user: UserModel,
    order: OrderModel,
    orderStatus: OrderStatusModel,
    rewardOrder: RewardOrderModel,
    transaction: TransactionModel,
    transactionStatus: TransactionStatusModel,
  ): Promise<void> {
    switch (transactionStatus.status) {
      case TransactionStatus.Completed: {
        switch (orderStatus.status) {
          case RewardOrderStatus.Created: {
            // Complete the reward order
            const orderStatus = await this.roStatusService.completed(order.id, `transaction:${transaction.uid}`)

            if (orderStatus) {
              try {
                // Create the reward order activity
                await this.activityService.createROActivity(user, order, rewardOrder)
              } catch (err: any) {
                const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
                this.logger.error(errorMessage)
              }
            }

            this.userBalanceService.notifyUserBalance(user.id)

            await Promise.all([
              this.sendRewardPush(order, rewardOrder),
              this.sendRewardEmail(user, rewardOrder),
              //
            ])

            break
          }
          default: {
            throw new Error(`unsupported: transaction status ${transactionStatus.status} not supported`)
          }
        }

        break
      }
      default:
        throw new Error(`unsupported: transaction status ${transactionStatus.status} not supported`)
    }
  }

  @inject(ConfigSymbol) config!: IConfig

  private async sendRewardPush(order: OrderModel, rewardOrder: RewardOrderModel) {
    const { details } = rewardOrder
    switch (details.type) {
      case RewardType.Referral_Referrer: {
        await this.sendReferralRewardPush(order, rewardOrder, details)
        break
      }
      case RewardType.Cashback_Buy: {
        await this.sendCashbackRewardPush(order, rewardOrder, details)
        break
      }
      default: {
        const notificationService = this.notificationFactory(details.type)
        if (notificationService) {
          await notificationService.notifyViaPush(rewardOrder.orderId)
        } else {
          this.logger.warn(`sendRewardPush(): unsupported reward type ${rewardOrder.rewardType}`)
        }
        break
      }
    }
  }

  private async sendReferralRewardPush(
    order: OrderModel,
    rewardOrder: RewardOrderModel,
    details: IReferralRewardDetails,
  ): Promise<void> {
    const { uid, userId } = order
    const { amount } = rewardOrder

    await this.pushService.scheduleSend({
      userId: userId,
      reason: 'reward_order:referral:completed',
      showOnForeground: true,
      payload: {
        version: 'v1',
        title: 'Referral bonus earned and credited',
        body:
          `Great job - you just earned ${NGN(amount, false)}` +
          ` because someone you referred just saved for the first time on Neobank App!` +
          ` This amount has been credited directly to your Neobank wallet!`,
      },
      data: {
        type: 'order.reward',
        version: 'v1',
        order: uid,
      },
    })
  }

  private async sendCashbackRewardPush(
    order: OrderModel,
    rewardOrder: RewardOrderModel,
    details: RewardOrderCashbackDetails,
  ): Promise<void> {
    const { uid, userId } = order
    const { amount, amountUsdc } = rewardOrder
    const { amount: poAmount, totalUsdc: poTotalUsdc, calculatedWinAmountPercentage } = details

    await this.pushService.scheduleSend({
      userId: userId,
      reason: 'reward_order:cashback:completed',
      showOnForeground: true,
      payload: {
        version: 'v1',
        title: `You just won ${PERCENTAGE(calculatedWinAmountPercentage)} cashback`,
        body:
          `Congratulations! You just won ${PERCENTAGE(calculatedWinAmountPercentage)}` +
          ` cashback of ${formatUsdcForNotifications(amountUsdc, false)} [${NGN(amount, false)}]` +
          ` on your deposit of ${formatUsdcForNotifications(poTotalUsdc, false)} [${NGN(poAmount, false)}]` +
          ` on Neobank. This has been credited to your Neobank wallet. Keep saving to keep winning!`,
      },
      data: {
        type: 'order.reward',
        version: 'v1',
        order: uid,
      },
    })
  }

  private async sendRewardEmail(user: UserModel, rewardOrder: RewardOrderModel) {
    const { details } = rewardOrder
    switch (details.type) {
      case RewardType.Referral_Referrer: {
        await this.sendReferralRewardEmail(user, rewardOrder, details)
        break
      }
      case RewardType.Cashback_Buy: {
        await this.sendCashbackRewardEmail(user, rewardOrder, details)
        break
      }
      default: {
        const notificationService = this.notificationFactory(details.type)
        if (notificationService) {
          await notificationService.notifyViaEmail(rewardOrder.orderId)
        } else {
          this.logger.warn(`sendRewardEmail(): unsupported reward type ${rewardOrder.rewardType}`)
        }

        break
      }
    }
  }

  private async sendReferralRewardEmail(
    user: UserModel,
    rewardOrder: RewardOrderModel,
    details: IReferralRewardDetails,
  ): Promise<void> {
    const { email } = user
    const { amount } = rewardOrder

    await this.mailerService.send({
      subject: `Congratulations - You just earned ${NGN(amount, false)} as a referral bonus!`,
      to: email,
      template: {
        name: MailTemplates.ReferralReferrer,
        variables: {
          reward_order_amount: NGN(amount, false),
        },
        conditionalContent: {},
      },
    })
  }

  private async sendCashbackRewardEmail(
    user: UserModel,
    rewardOrder: RewardOrderModel,
    details: RewardOrderCashbackDetails,
  ): Promise<void> {
    const { amount, amountUsdc } = rewardOrder
    const neobankAppLink = this.config.get<string>('deepLinkHome')
    const { amount: poAmount, totalUsdc: poTotalUsdc, calculatedWinAmountPercentage } = details

    await this.mailerService.send({
      subject:
        `🎉 Yay! You just won ${formatUsdcForNotifications(amountUsdc, false)} ` +
        `(${NGN(amount, false)}) cashback on your deposit!`,
      to: user.email,
      template: {
        name: MailTemplates.CashbackBuy,
        variables: {
          cashback_amount_usdc: formatUsdcForNotifications(amountUsdc, false),
          cashback_amount: NGN(amount, false),
          cashback_percentage: PERCENTAGE(calculatedWinAmountPercentage),
          purchase_order_amount_usdc: formatUsdcForNotifications(poTotalUsdc, false),
          purchase_order_amount: NGN(poAmount, false),
          neobank_app_link: neobankAppLink,
        },
        conditionalContent: {},
      },
    })
  }
}

class TotalUsdc {
  @readable(Number, true) amount!: number | null
}
