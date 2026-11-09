2021

import { inject, injectable } from 'inversify'

import { of } from '@ts-awesome/orm'
import { BadRequestError, RequestError, StatusCode } from '@ts-awesome/rest'
import { readable } from '@ts-awesome/model-reader'
import { ConfigSymbol, IConfig } from '@ts-awesome/config'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  IUserBankAccountEntityService,
  OrderModel,
  UserBankAccountEntityServiceSymbol,
  UserModel,
  ISellOrderEntityService,
  SellOrderEntityServiceSymbol,
  UserWalletEntityServiceSymbol,
  IUserWalletEntityService,
  UserBankAccountConfigModel,
  UserBankAccountModel,
  IOrderEntityService,
  OrderEntityServiceSymbol,
  OrderType,
  UserLevelEntityServiceSymbol,
  UserLevelLimitEntityServiceSymbol,
  IUserLevelEntityService,
  IUserLevelLimitEntityService,
  SellOrderStatus,
  IUserDetailsEntityService,
  IOrderHelpdeskTicketEntityService,
  OrderHelpdeskTicketEntityServiceSymbol,
  UserDetailsEntityServiceSymbol,
  IOrderStatusEntityService,
  OrderStatusEntityServiceSymbol,
  IBankEntityService,
  BankEntityServiceSymbol,
  IUserEntityService,
  UserEntityServiceSymbol,
  SellOrderStatusReason,
  LiquidityProviderBankAccountModel,
  ModernTreasuryWalletEntityServiceSymbol,
  IModernTreasuryWalletEntityService,
  Currency,
  TransactionStatus,
  TransactionStatusModel,
  ISellOrderDetailsEntityService,
  SellOrderDetailsEntityServiceSymbol,
  SellOrderFeesEntityServiceSymbol,
  ISellOrderFeesEntityService,
} from '../models/db'

import { AppConfigSymbol, FreshdeskConfigSymbol, IAppConfig, IFreshdeskConfig } from '../models/config'
import { ICreateSellOrderInput } from '../models/request'
import { CanCreateOrderOutput } from '../models/response'
import {
  FreshdeskTicketPriority,
  FreshdeskTicketStatus,
  FreshdeskTicketType,
  ICreateTicketInput,
} from '../models/freshdesk'

import { IMailerService, MailerServiceSymbol } from '../lib/services/mailer'
import { MailTemplates } from './mailer/mailgun.service'

import { ILiquidityProviderService, LiquidityProviderServiceSymbol } from './liquidity-provider.service'
import { ISOStatusService, SOStatusServiceSymbol } from './so-status.service'
import { DateFormatterServiceSymbol, IDateFormatterService } from './date-formatter.service'
import { FreshdeskServiceSymbol, IFreshdeskService } from './freshdesk.service'
import { ActivityServiceSymbol, IActivityService } from './activity/activity.service'
import { IUserBalanceService, UserBalanceServiceSymbol } from './user-balance.service'
import { IOrderConfigurationService, OrderConfigurationServiceSymbol } from './order-configuration.service'
import { IUserOrderService, UserOrderServiceSymbol } from './user-order.service'
import { IUserLevelLimitService, UserLevelLimitServiceSymbol } from './user-level-limit.service'
import { ITransactionService, TransactionServiceSymbol } from './transaction/transaction.service'
import { IPushService, PushServiceSymbol } from './push.service'
import { IUserLimitService, UserLimitServiceSymbol } from './user-limit.service'

class TotalUsdc {
  @readable(Number, true) amount!: number | null
}

export interface ISellOrderService {
  canCreateSellOrder(userId: number): Promise<CanCreateOrderOutput>
  createSellOrder(body: ICreateSellOrderInput, user: UserModel, lockVersion: number): Promise<OrderModel | null>
  createHelpdeskTicket(
    user: UserModel,
    order: OrderModel,
    lpBankAccount: LiquidityProviderBankAccountModel,
    helpdeskAgentGroupId: string,
  ): Promise<void>
  onTransactionStatusChanged(transactionStatus: TransactionStatusModel): Promise<void>
}

export const SellOrderServiceSymbol = Symbol.for('ISellOrderService')

@injectable()
export class SellOrderService implements ISellOrderService {
  @inject(FreshdeskConfigSymbol) freshdeskConfig!: IFreshdeskConfig
  @inject(AppConfigSymbol) appConfig!: IAppConfig
  @inject(ConfigSymbol) config!: IConfig

  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService
  @inject(UserWalletEntityServiceSymbol) userWalletEntityService!: IUserWalletEntityService
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(SellOrderEntityServiceSymbol) sellOrderEntityService!: ISellOrderEntityService
  @inject(ModernTreasuryWalletEntityServiceSymbol)
  modernTreasuryWalletEntityService!: IModernTreasuryWalletEntityService
  @inject(UserLevelEntityServiceSymbol) userLevelService!: IUserLevelEntityService
  @inject(UserLevelLimitEntityServiceSymbol) userLevelLimitEntityService!: IUserLevelLimitEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(OrderHelpdeskTicketEntityServiceSymbol) orderHelpdeskTicketEntityService!: IOrderHelpdeskTicketEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService
  @inject(BankEntityServiceSymbol) bankEntityService!: IBankEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(SellOrderDetailsEntityServiceSymbol) sellOrderDetailsEntityService!: ISellOrderDetailsEntityService

  @inject(LiquidityProviderServiceSymbol) liquidityProviderService!: ILiquidityProviderService
  @inject(SOStatusServiceSymbol) soStatusService!: ISOStatusService
  @inject(TransactionServiceSymbol) transactionService!: ITransactionService
  @inject(DateFormatterServiceSymbol) dateFormatterService!: IDateFormatterService
  @inject(FreshdeskServiceSymbol) freshdeskService!: IFreshdeskService
  @inject(ActivityServiceSymbol) activityService!: IActivityService
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService
  @inject(OrderConfigurationServiceSymbol) orderConfigurationService!: IOrderConfigurationService
  @inject(UserOrderServiceSymbol) userOrderService!: IUserOrderService
  @inject(UserLevelLimitServiceSymbol) userLevelLimitService!: IUserLevelLimitService
  @inject(UserLimitServiceSymbol) userLimitService!: IUserLimitService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(PushServiceSymbol) pushService!: IPushService

  @inject(SellOrderFeesEntityServiceSymbol) sellOrderFeesEntityService!: ISellOrderFeesEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(SellOrderService)
  }

  async canCreateSellOrder(userId: number): Promise<CanCreateOrderOutput> {
    const orderConfiguration = await this.orderConfigurationService.getOrderConfigurations()

    // If the order configuration is null or if the max orders or SO values are null, return canCreate as true - no limits
    // If the values are 0 return false - no orders allowed to be created
    if (
      !orderConfiguration ||
      orderConfiguration.maxOpenedOrdersAllowed === null ||
      orderConfiguration.maxOpenedSellOrdersAllowed === null
    ) {
      return { canCreate: true, reason: '' }
    } else if (orderConfiguration.maxOpenedOrdersAllowed === 0 || orderConfiguration.maxOpenedSellOrdersAllowed === 0) {
      return { canCreate: false, reason: 'None allowed' }
    }

    const openOrders = await this.userOrderService.getOpenOrderCounts(userId)

    let canCreate = true
    let reason = ''

    const maxOpenSOsLimitReached = await this.userOrderService.hasReachedMaxOpenedOrdersLimit(
      orderConfiguration.maxOpenedSellOrdersAllowed,
      openOrders.openSellOrderCount,
    )
    const maxOpenOrdersLimitReached = await this.userOrderService.hasReachedMaxOpenedOrdersLimit(
      orderConfiguration.maxOpenedOrdersAllowed,
      openOrders.totalOpenOrderCount,
    )

    // Logic for when can create should return true
    // WHEN max allowed opened SO count - opened SOs count > 0 AND max allowed opened orders - total opened orders (any type) > 0
    if (maxOpenSOsLimitReached) {
      canCreate = false
      reason = `You cannot have more than ${orderConfiguration.maxOpenedSellOrdersAllowed} opened sell orders at a time`
    } else if (maxOpenOrdersLimitReached) {
      canCreate = false
      reason = `You cannot have more than ${orderConfiguration.maxOpenedOrdersAllowed} opened orders at a time`
    }

    return { canCreate, reason }
  }

  async createSellOrder(body: ICreateSellOrderInput, user: UserModel, lockVersion: number): Promise<OrderModel | null> {
    // Retrieve the user's wallet
    const userWallet = await this.userWalletEntityService.getOne({ userId: user.id })
    if (!userWallet) {
      throw new RequestError('User must have a wallet', 'UnexpectedError', StatusCode.ServerError)
    }

    // Verify user bank account is not deleted
    const userBankAccount = await this.userBankAccountEntityService
      .select()
      .join(UserBankAccountConfigModel, (root, other) => root.id.eq(other.userBankId))
      .where(x => x.uid.eq(body.sellOrder.userBankAccount))
      .where(() => of(UserBankAccountConfigModel, 'isDeleted').eq(false))
      .fetchOne(UserBankAccountModel)

    if (!userBankAccount) {
      throw new RequestError('User must have an active bank account', 'UnexpectedError', StatusCode.ServerError)
    }

    // Get a random liquidity provider
    const [
      lp,
      lpConfig,
      lpBankAccount,
      lpBankAccountConfig,
    ] = await this.liquidityProviderService.getRandomLiquidityProvider()

    const helpdeskAgentGroupId = lpBankAccountConfig.helpdeskAgentGroupId
    if (!helpdeskAgentGroupId) {
      throw new RequestError(
        'Liquidity provider must have a helpdesk agent group',
        'UnexpectedError',
        StatusCode.ServerError,
      )
    }

    // Create reference number
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.SellOrder)

    // Create the order
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.SellOrder,
      referenceNumber: referenceNumber,
      userId: user.id,
    })

    // Create the sell order
    const sellOrder = await this.sellOrderEntityService.addOne({
      orderId: order.id,
      includeFees: body.sellOrder.includeFees,
      amount: body.sellOrder.amount,
      amountUsdc: body.sellOrder.amountUsdc,
      exchangeRate: body.sellOrder.exchangeRate,
      // deprecated - removed in favour of sellOrderFeesEntityService
      fee: body.calculationResult.fee.config.feeMultiplier,
      // deprecated - removed in favour of sellOrderFeesEntityService
      agentFee: body.calculationResult.fee.config.agentFee,
      feeTotal: body.sellOrder.feeTotal,
      total: body.sellOrder.total,
      totalUsdc: body.sellOrder.totalUsdc,
      liquidityProviderId: lp.id,
      userBankAccountId: userBankAccount.id,
      fromWalletId: userWallet.walletId,
      toWalletId: lpConfig.walletId,
    })

    await Promise.all([
      // Create sell order details
      this.sellOrderDetailsEntityService.addOne({
        orderId: order.id,
      }),
      // create fee details
      this.sellOrderFeesEntityService.addOne({
        orderId: order.id,
        feeTotal: sellOrder.feeTotal,
        flatFee: body.calculationResult.fee.config.flatFee,
        percentageFee: body.calculationResult.fee.config.percentageFee,
      }),
      // Create initial sell order status
      this.soStatusService.create(order.id, user.uid),
    ])

    // Initiate a transfer
    const [fromWallet, toWallet] = await Promise.all([
      this.modernTreasuryWalletEntityService.getOne({ walletId: userWallet.walletId }),
      this.modernTreasuryWalletEntityService.getOne({ walletId: lpConfig.walletId }),
    ])

    if (!fromWallet) {
      throw new Error('The user wallet must exist to initiate a transfer')
    }

    if (!toWallet) {
      throw new Error('The LP wallet must exist to initiate a transfer')
    }

    const [transaction, transactionStatusChangeResult] = await this.transactionService.createTransaction({
      orderId: sellOrder.orderId,
      source: fromWallet.ledgerAccountId,
      dest: toWallet.ledgerAccountId,
      amount: sellOrder.amountUsdc,
      currency: Currency.USDC,
      createdBy: `user:${user.uid}`,
      lockVersion: lockVersion,
    })

    const { transactionStatus, changed } = transactionStatusChangeResult
    if (transactionStatus.status !== TransactionStatus.Pending) {
      // TODO: uncomment when retries will come
      // await this.soStatusService.transferFailed(order.id, user.uid)

      // TODO: remove when retries will come
      await this.soStatusService.cancelled(order.id, `transaction:${transaction.uid}`)

      this.logger.error(`critical: unexpected transfer status ${transactionStatus.status} for order:${order.uid}`)

      return null
    }

    // Create the so activity records
    try {
      await this.activityService.createSOActivity(user, order, sellOrder)
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
    }

    try {
      const result = await this.transactionService.complete(transactionStatus.transactionId)

      if (result.changed) {
        //FIGURE: do we want to do this is in parallel?
        await this.onTransactionStatusChanged(result.transactionStatus)
      }
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
    }

    return order
  }

  async createHelpdeskTicket(
    user: UserModel,
    order: OrderModel,
    lpBankAccount: LiquidityProviderBankAccountModel,
    helpdeskAgentGroupId: string,
  ): Promise<void> {
    const sellOrder = await this.sellOrderEntityService.getOne({ orderId: order.id })
    if (!sellOrder) {
      throw new BadRequestError('Sell order with order id not found')
    }

    const publicEnv = this.config.get('publicEnv', String).toLowerCase()
    let env = ''
    if (publicEnv === 'development') {
      env = ' [TEST]'
    } else if (publicEnv === 'staging') {
      env = ' [STG]'
    } else if (publicEnv === 'feature') {
      env = ' [FEATURE]'
    }

    const [userDetails, bankAccount, orderStatus] = await Promise.all([
      this.userDetailsEntityService.getOne({ userId: user.id }),
      this.userBankAccountEntityService.getOne({ id: sellOrder.userBankAccountId }),
      this.orderStatusEntityService.getOne({ orderId: order.id }),
    ])

    const bank = await this.bankEntityService.getOne({ id: bankAccount!.bankId })

    const orderDate = await this.dateFormatterService.utcToNgTimeString(order.createdAt)

    const fields = this.freshdeskConfig.fields
    const custom_fields = {}
    custom_fields[`${fields.general.INTERNAL_TYPE.name}`] = fields.general.INTERNAL_TYPE.choices.SELL_ORDER
    custom_fields[`${fields.sell_order.REFERENCE_NUMBER.name}`] = order.referenceNumber
    custom_fields[`${fields.sell_order.AMOUNT.name}`] = sellOrder.total.toString()
    custom_fields[`${fields.sell_order.CUSTOMER_NAME.name}`] = userDetails!.fullName ? userDetails!.fullName : ''
    custom_fields[`${fields.sell_order.CUSTOMER_ACCOUNT_NUMBER.name}`] = bankAccount!.bankAccountNumber
    custom_fields[`${fields.sell_order.ORDER_DATE.name}`] = orderDate
    custom_fields[`${fields.sell_order.EXCHAGE_RATE.name}`] = sellOrder.exchangeRate.toString()
    // deprecated
    custom_fields[`${fields.sell_order.FEE_NEOBANK_MULTIPLIER.name}`] = '0'
    custom_fields[`${fields.sell_order.FEE_AGENT.name}`] = sellOrder.feeTotal.toString()
    custom_fields[`${fields.sell_order.AMOUNT_USDC.name}`] = sellOrder.totalUsdc.toString()

    const description =
      `Type: Sell Order<br>` +
      `Reference Number: ${order.referenceNumber}<br>` +
      `Amount: ${sellOrder.total}<br>` +
      `Amount (USDC): ${sellOrder.totalUsdc}<br>` +
      `Order Date: ${orderDate}<br>` +
      `Order Status: ${orderStatus!.status}<br>` +
      `Include Fees: ${sellOrder.includeFees}<br>` +
      `Total: ${sellOrder.total}<br>` +
      `Total (USDC): ${sellOrder.totalUsdc}<br>` +
      `Exchange Rate: ${sellOrder.exchangeRate}<br>` +
      `Total Fee: ${sellOrder.feeTotal}<br>` +
      `<br>` +
      `<b>Customer Information</b><br>` +
      `Customer Name: ${userDetails?.fullName}<br>` +
      `Bank Name: ${bank?.name}<br>` +
      `Customer Account Name: ${bankAccount?.bankAccountName ?? userDetails?.fullName}<br>` +
      `Customer Account Number: ${bankAccount?.bankAccountNumber}<br>` +
      `Amount: ${sellOrder.total}<br>` +
      `<br>` +
      `<b>Agent Information</b><br>` +
      `Bank Name: ${lpBankAccount.bankName}<br>` +
      `Bank Account Name: ${lpBankAccount.bankAccountName}<br>` +
      `Bank Account Number: ${lpBankAccount.bankAccountNumber}<br>`

    const ticketFields: ICreateTicketInput = {
      subject: `Sell Order #${order.referenceNumber}${env}`,
      description: description,
      type: this.freshdeskConfig.fields.general.TYPE.choices.OPERATIONS,
      email: this.freshdeskConfig.systemContactEmail,
      priority: FreshdeskTicketPriority.Urgent,
      status: FreshdeskTicketStatus.Open,
      group_id: parseInt(helpdeskAgentGroupId),
      custom_fields: custom_fields,
    }

    const ticket = await this.freshdeskService.createTicket(ticketFields)

    await this.orderHelpdeskTicketEntityService.addOne({
      orderId: order.id,
      ticketType: FreshdeskTicketType.Operations,
      ticketId: ticket.id,
    })
  }

  async onTransactionStatusChanged(transactionStatus: TransactionStatusModel): Promise<void> {
    const [transaction] = await this.transactionService.getTransaction(transactionStatus.transactionId)

    if (!transaction) {
      throw new Error(`precondition failed: transaction not found`)
    }

    const [order, sellOrder, sellOrderFees] = await Promise.all([
      this.orderEntityService.getOne({ id: transaction.orderId }),
      this.sellOrderEntityService.getOne({ orderId: transaction.orderId }),
      this.sellOrderFeesEntityService.getOne({ orderId: transaction.orderId }),
    ])
    if (!order) {
      throw new Error(`precondition failed: order for transaction:${transaction.uid} not found`)
    }

    if (!sellOrder) {
      throw new Error(`precondition failed: sell order with order:${order.uid} not found`)
    }

    if (!sellOrderFees) {
      throw new Error(`precondition failed: sell order fee with order:${order.uid} not found`)
    }

    const user = await this.userEntityService.getOne({ id: order.userId })
    if (!user) {
      throw new Error(`precondition failed: user not found`)
    }

    switch (transactionStatus.status) {
      case TransactionStatus.Completed:
        {
          const currentOrderStatus = await this.orderStatusEntityService.getOne({ orderId: order.id })
          if (!currentOrderStatus) {
            throw new Error('precondition failed: order status undefined')
          }

          switch (currentOrderStatus.status) {
            case SellOrderStatus.Created: {
              const orderStatus = await this.soStatusService.cryptoTransferred(
                order.id,
                `transaction:${transaction.uid}`,
              )

              if (orderStatus) {
                try {
                  await this.activityService.updateSOActivity(
                    order.id,
                    <SellOrderStatus>orderStatus.status,
                    SellOrderStatusReason.None,
                    user.fireUserId,
                  )

                  const [
                    lpBankAccount,
                    lpBankAccountConfig,
                  ] = await this.liquidityProviderService.getRandomLiquidityProviderBankAccount(
                    sellOrder.liquidityProviderId,
                  )

                  const helpdeskAgentGroupId = lpBankAccountConfig.helpdeskAgentGroupId
                  if (helpdeskAgentGroupId) {
                    // Create the freshdesk ticket
                    await this.createHelpdeskTicket(user, order, lpBankAccount, helpdeskAgentGroupId)
                  } else {
                    this.logger.error(
                      `unxepected: liquidity provider must have a helpdesk agent group. helpdesk ticket not created for order id: ${order.id}`,
                    )
                  }
                } catch (err: any) {
                  const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
                  this.logger.error(errorMessage)
                }
              }
              break
            }
            case SellOrderStatus.RefundInitiated: {
              const orderStatus = await this.soStatusService.refunded(order.id, `transaction:${transaction.uid}`)

              if (orderStatus) {
                try {
                  await this.activityService.updateSOActivity(
                    order.id,
                    <SellOrderStatus>orderStatus.status,
                    SellOrderStatusReason.Refunded,
                    user.fireUserId,
                  )

                  const ticket = await this.orderHelpdeskTicketEntityService.getOne({ orderId: order.id })
                  if (ticket) {
                    await this.freshdeskService.createNote(
                      ticket.ticketId,
                      {
                        body: 'Sell Order Status: Refunded',
                      },
                      true,
                    )
                  } else {
                    this.logger.error(`unxepected: could not find helpdesk ticket for order id: ${order.id}`)
                  }
                } catch (err: any) {
                  const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
                  this.logger.error(errorMessage)
                }

                await this.mailerService.send({
                  subject: 'We had to refund your transaction.',
                  to: user.email,
                  template: {
                    name: MailTemplates.RefundComplete,
                    variables: {
                      reason: 'an error in transferring your funds',
                    },
                    conditionalContent: {},
                  },
                })

                await this.pushService.send(user, {
                  title: `Your withdrawal was unsuccessful`,
                  body: `There was an error in transferring your funds to your bank account. Please try again or chat with us on Whatsapp - We’d love to help!`,
                })
              }
              break
            }
            default:
              throw new Error('precondition failed: sell order is in invalid state')
          }

          this.userBalanceService.notifyUserBalance(user.id)
        }
        break
      case TransactionStatus.Failed:
        {
          const orderStatus = await this.soStatusService.cancelled(order.id, `transaction:${transaction.uid}`)

          if (orderStatus) {
            try {
              await this.activityService.updateSOActivity(
                order.id,
                <SellOrderStatus>orderStatus.status,
                SellOrderStatusReason.FailedWithdrawing,
                user.fireUserId,
              )

              const sellOrderTicket = await this.orderHelpdeskTicketEntityService.getOne({
                orderId: order.id,
                ticketType: FreshdeskTicketType.Operations,
              })

              if (sellOrderTicket) {
                await this.freshdeskService.createNote(
                  sellOrderTicket.ticketId,
                  {
                    body:
                      "Transfer from the User's wallet to the LP wallet has failed. Sell Order was automatically cancelled.",
                  },
                  true,
                )
                await this.freshdeskService.updateTicket(sellOrderTicket.ticketId, {
                  status: FreshdeskTicketStatus.Resolved,
                })
              } else {
                this.logger.error(`unexpected: freshdesk ticket for order id:${order.id} was not found`)
              }
            } catch (err: any) {
              const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
              this.logger.error(errorMessage)
            }
          }
        }
        break
      default:
        throw new Error(`unsupported: transaction status ${transactionStatus.status} not supported`)
    }
  }
}
