2021

import { inject, injectable } from 'inversify'

import { alias, not, of, sum } from '@ts-awesome/orm'
import { BadRequestError, RequestError } from '@ts-awesome/rest'
import { readable } from '@ts-awesome/model-reader'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ConfigSymbol, IConfig } from '@ts-awesome/config'

import { add, getTime, startOfDay } from 'date-fns'

import currency from 'currency.js'

import {
  IPurchaseOrderEntityService,
  IUserBankAccountEntityService,
  IUserDetailsEntityService,
  IUserLevelLimitEntityService,
  OrderModel,
  OrderStatusModel,
  PurchaseOrderEntityServiceSymbol,
  UserBankAccountEntityServiceSymbol,
  UserDetailsEntityServiceSymbol,
  UserLevelLimitEntityServiceSymbol,
  UserModel,
  IOrderHelpdeskTicketEntityService,
  OrderHelpdeskTicketEntityServiceSymbol,
  PurchaseOrderStatus,
  OrderEntityServiceSymbol,
  IOrderEntityService,
  UserEntityServiceSymbol,
  IUserEntityService,
  IUserWalletEntityService,
  UserWalletEntityServiceSymbol,
  UserBankAccountConfigModel,
  UserBankAccountModel,
  OrderType,
  TransactionMode,
  IOrderStatusEntityService,
  OrderStatusEntityServiceSymbol,
  IPurchaseOrderDetailsEntityService,
  PurchaseOrderDetailsEntityServiceSymbol,
  IBankEntityService,
  BankEntityServiceSymbol,
  TransactionStatus,
  TransactionStatusModel,
  PurchaseOrderStatusReason,
  PurchaseOrderFeesEntityServiceSymbol,
  IPurchaseOrderFeesEntityService,
} from '../models/db'

import {
  ICreateTicketInput,
  FreshdeskTicketPriority,
  FreshdeskTicketStatus,
  FreshdeskTicketType,
} from '../models/freshdesk'

import { AppConfigSymbol, FreshdeskConfigSymbol, IAppConfig, IFreshdeskConfig } from '../models/config'
import { ICreatePurchaseOrderInput } from '../models/request'
import { CanCreateOrderOutput } from '../models/response'

import { ActivityServiceSymbol, IActivityService } from './activity/activity.service'
import { DateFormatterServiceSymbol, IDateFormatterService } from './date-formatter.service'
import { FreshdeskServiceSymbol, IFreshdeskService } from './freshdesk.service'
import { IPOStatusService, POStatusServiceSymbol } from './po-status.service'
import { ILiquidityProviderService, LiquidityProviderServiceSymbol } from './liquidity-provider.service'
import { IOrderConfigurationService, OrderConfigurationServiceSymbol } from './order-configuration.service'
import { IUserOrderService, UserOrderServiceSymbol } from './user-order.service'
import { IUserBalanceService, UserBalanceServiceSymbol } from './user-balance.service'
import { IUserLevelLimitService, UserLevelLimitServiceSymbol } from './user-level-limit.service'
import { ITransactionService, TransactionServiceSymbol } from './transaction/transaction.service'
import { IPushService, PushServiceSymbol } from './push.service'
import { USDC } from '../utils/formatter'

class TotalUsdc {
  @readable(Number, true) amount!: number | null
}

export interface IPurchaseOrderService {
  canCreatePurchaseOrder(userId: number): Promise<CanCreateOrderOutput>
  createPurchaseOrder(body: ICreatePurchaseOrderInput, user: UserModel): Promise<OrderModel>
  createHelpdeskTicket(user: UserModel, order: OrderModel, helpdeskAgentGroupId: string): Promise<void>
  onTransactionStatusChanged(transactionStatus: TransactionStatusModel): Promise<void>
}

export const PurchaseOrderServiceSymbol = Symbol.for('IPurchaseOrderService')

@injectable()
export class PurchaseOrderService implements IPurchaseOrderService {
  @inject(AppConfigSymbol) appConfig!: IAppConfig
  @inject(FreshdeskConfigSymbol) freshdeskConfig!: IFreshdeskConfig
  @inject(ConfigSymbol) config!: IConfig

  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserLevelLimitEntityServiceSymbol) userLevelLimitEntityService!: IUserLevelLimitEntityService
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService
  @inject(UserWalletEntityServiceSymbol) userWalletEntityService!: IUserWalletEntityService
  @inject(PurchaseOrderEntityServiceSymbol) purchaseOrderEntityService!: IPurchaseOrderEntityService
  @inject(OrderHelpdeskTicketEntityServiceSymbol) orderHelpdeskTicketEntityService!: IOrderHelpdeskTicketEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService
  @inject(PurchaseOrderDetailsEntityServiceSymbol)
  purchaseOrderDetailsEntityService!: IPurchaseOrderDetailsEntityService
  @inject(BankEntityServiceSymbol) bankEntityService!: IBankEntityService

  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService
  @inject(TransactionServiceSymbol) transactionService!: ITransactionService
  @inject(POStatusServiceSymbol) poStatusService!: IPOStatusService
  @inject(ActivityServiceSymbol) activityService!: IActivityService
  @inject(FreshdeskServiceSymbol) freshdeskService!: IFreshdeskService
  @inject(DateFormatterServiceSymbol) dateFormatterService!: IDateFormatterService
  @inject(LiquidityProviderServiceSymbol) liquidityProviderService!: ILiquidityProviderService
  @inject(OrderConfigurationServiceSymbol) orderConfigurationService!: IOrderConfigurationService
  @inject(UserOrderServiceSymbol) userOrderService!: IUserOrderService
  @inject(UserLevelLimitServiceSymbol) userLevelLimitService!: IUserLevelLimitService
  @inject(PushServiceSymbol) pushService!: IPushService

  @inject(PurchaseOrderFeesEntityServiceSymbol) purchaseOrderFeesEntityService!: IPurchaseOrderFeesEntityService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(PurchaseOrderService)
  }

  async canCreatePurchaseOrder(userId: number): Promise<CanCreateOrderOutput> {
    const orderConfiguration = await this.orderConfigurationService.getOrderConfigurations()

    // If the order configuration is null or if the max orders or PO values are null, return canCreate as true - no limits
    // If the values are 0 return false - no orders allowed to be created
    if (
      !orderConfiguration ||
      orderConfiguration.maxOpenedOrdersAllowed === null ||
      orderConfiguration.maxOpenedPurchaseOrdersAllowed === null
    ) {
      return { canCreate: true, reason: '' }
    } else if (
      orderConfiguration.maxOpenedOrdersAllowed === 0 ||
      orderConfiguration.maxOpenedPurchaseOrdersAllowed === 0
    ) {
      return { canCreate: false, reason: 'None allowed' }
    }

    const openOrders = await this.userOrderService.getOpenOrderCounts(userId)

    let canCreate = true
    let reason = ''

    const maxOpenPOsLimitReached = await this.userOrderService.hasReachedMaxOpenedOrdersLimit(
      orderConfiguration.maxOpenedPurchaseOrdersAllowed,
      openOrders.openPurchaseOrderCount,
    )
    const maxOpenOrdersLimitReached = await this.userOrderService.hasReachedMaxOpenedOrdersLimit(
      orderConfiguration.maxOpenedOrdersAllowed,
      openOrders.totalOpenOrderCount,
    )

    // Logic for when can create should return true
    // WHEN max allowed opened PO count - opened POs count > 0 AND max allowed opened orders - total opened orders (any type) > 0
    if (maxOpenPOsLimitReached) {
      canCreate = false
      reason = `You cannot have more than ${orderConfiguration.maxOpenedPurchaseOrdersAllowed} opened purchase orders at a time`
    } else if (maxOpenOrdersLimitReached) {
      canCreate = false
      reason = `You cannot have more than ${orderConfiguration.maxOpenedOrdersAllowed} opened orders at a time`
    }

    return { canCreate, reason }
  }

  async createPurchaseOrder(body: ICreatePurchaseOrderInput, user: UserModel): Promise<OrderModel> {
    // Retrieve the user's wallet
    const userWallet = await this.userWalletEntityService.getOne({ userId: user.id })
    if (!userWallet) {
      throw new RequestError('User must have a wallet', 'UnexpectedError', 500)
    }

    // Verify user bank account is not deleted
    const userBankAccount = await this.userBankAccountEntityService
      .select()
      .join(UserBankAccountConfigModel, (root, other) => root.id.eq(other.userBankId))
      .where(x => x.uid.eq(body.purchaseOrder.userBankAccount))
      .where(() => of(UserBankAccountConfigModel, 'isDeleted').eq(false))
      .fetchOne(UserBankAccountModel)

    if (!userBankAccount) {
      throw new RequestError('User must have an active bank account', 'UnexpectedError', 500)
    }

    const bank = await this.bankEntityService.getOne({ id: userBankAccount.bankId })
    if (!bank) {
      throw new RequestError(
        'The bank associated with the user bank account is not active in our system',
        'UnexpectedError',
        500,
      )
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
      throw new RequestError('Liquidity provider must have a helpdesk agent group', 'UnexpectedError', 500)
    }

    const currentDate = new Date()

    // Get expiration date - Current date + 5 minutes (buyExpirationTimeout is valued in seconds)
    const buyExpirationTimeout = this.appConfig.buyExpirationTimeout
    const expirationDate = add(currentDate, { seconds: buyExpirationTimeout })

    // Create reference number
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.PurchaseOrder)

    // Create the order
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.PurchaseOrder,
      referenceNumber: referenceNumber,
      userId: user.id,
    })

    // Create the purchase order
    const purchaseOrder = await this.purchaseOrderEntityService.addOne({
      orderId: order.id,
      includeFees: body.purchaseOrder.includeFees,
      amount: body.purchaseOrder.amount,
      exchangeRate: body.purchaseOrder.exchangeRate,
      // deprecated - removed in favour of purchaseOrderFeesEntityService
      fee: body.calculationResult.fee.config.feeMultiplier,
      // deprecated - removed in favour of purchaseOrderFeesEntityService
      agentFee: body.calculationResult.fee.config.agentFee,
      feeTotal: body.purchaseOrder.feeTotal,
      total: body.purchaseOrder.total,
      totalUsdc: body.purchaseOrder.totalUsdc,
      liquidityProviderId: lp.id,
      liquidityProviderBankAccountId: lpBankAccount.id,
      userBankAccountId: userBankAccount.id,
      fromWalletId: lpConfig.walletId,
      toWalletId: userWallet.walletId,
      expiresAt: expirationDate,
    })

    await Promise.all([
      // Create purchase order details
      this.purchaseOrderDetailsEntityService.addOne({
        orderId: order.id,
        bankCode: bank.bankCode,
      }),
      // Create initial PO status
      this.poStatusService.create(order.id, user.uid),
      // create fee details
      this.purchaseOrderFeesEntityService.addOne({
        orderId: purchaseOrder.orderId,
        feeTotal: purchaseOrder.feeTotal,
        flatFee: body.calculationResult.fee.config.flatFee,
        percentageFee: body.calculationResult.fee.config.percentageFee,
      }),
    ])

    // next calls require order status to be created
    await Promise.all([
      // Create the freshdesk ticket
      this.createHelpdeskTicket(user, order, helpdeskAgentGroupId),
      // Create the po activity records
      this.activityService.createPOActivity(user, order, purchaseOrder, TransactionMode.BankTransfer),
    ])

    return order
  }

  async createHelpdeskTicket(user: UserModel, order: OrderModel, helpdeskAgentGroupId: string): Promise<void> {
    const purchaseOrder = await this.purchaseOrderEntityService.getOne({ orderId: order.id })
    if (!purchaseOrder) {
      throw new BadRequestError('Purchase order with order id not found')
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
      this.userBankAccountEntityService.getOne({ id: purchaseOrder.userBankAccountId }),
      this.orderStatusEntityService.getOne({ orderId: order.id }),
    ])

    const bank = await this.bankEntityService.getOne({ id: bankAccount!.bankId })
    const [lpBankAccount] = await this.liquidityProviderService.getLiquidityProviderBankAccount(
      purchaseOrder.liquidityProviderBankAccountId,
    )

    const [orderDate, expirationDate] = await Promise.all([
      this.dateFormatterService.utcToNgTimeString(order.createdAt),
      this.dateFormatterService.utcToNgTimeString(purchaseOrder.expiresAt),
    ])

    const fields = this.freshdeskConfig.fields
    const custom_fields = {}
    custom_fields[`${fields.general.INTERNAL_TYPE.name}`] = fields.general.INTERNAL_TYPE.choices.PURCHASE_ORDER
    custom_fields[`${fields.purchase_order.REFERENCE_NUMBER.name}`] = order.referenceNumber
    custom_fields[`${fields.purchase_order.AMOUNT.name}`] = purchaseOrder.total.toString()
    custom_fields[`${fields.purchase_order.CUSTOMER_NAME.name}`] = userDetails!.fullName ? userDetails!.fullName : ''
    custom_fields[`${fields.purchase_order.CUSTOMER_ACCOUNT_NUMBER.name}`] = bankAccount!.bankAccountNumberPublic
    custom_fields[`${fields.purchase_order.ORDER_DATE.name}`] = orderDate
    custom_fields[`${fields.purchase_order.ORDER_EXPIRATION_DATE.name}`] = expirationDate
    custom_fields[`${fields.purchase_order.EXCHAGE_RATE.name}`] = purchaseOrder.exchangeRate.toString()
    custom_fields[`${fields.purchase_order.FEE_NEOBANK_MULTIPLIER.name}`] = '0' // deprecated - to be removed in a future release
    custom_fields[`${fields.purchase_order.FEE_AGENT.name}`] = purchaseOrder.feeTotal.toString()
    custom_fields[`${fields.purchase_order.AMOUNT_USDC.name}`] = purchaseOrder.totalUsdc.toString()

    const description =
      `Type: Purchase Order<br>` +
      `Reference Number: ${order.referenceNumber}<br>` +
      `Amount: ${purchaseOrder.total}<br>` +
      `Order Date: ${orderDate}<br>` +
      `Order Expiration Date: ${expirationDate}<br>` +
      `Order Status: ${orderStatus!.status}<br>` +
      `Include Fees: ${purchaseOrder.includeFees}<br>` +
      `Total (USDC): ${purchaseOrder.totalUsdc}<br>` +
      `Exchange Rate: ${purchaseOrder.exchangeRate}<br>` +
      `Total Fee: ${purchaseOrder.feeTotal}<br>` +
      `<br>` +
      `<b>Customer Information</b><br>` +
      `Customer Name: ${userDetails?.fullName}<br>` +
      `Bank Name: ${bank?.name}<br>` +
      `Customer Account Name: ${bankAccount?.bankAccountName ?? userDetails?.fullName}<br>` +
      `Customer Account Number: ${bankAccount?.bankAccountNumber}<br>` +
      `Amount: ${purchaseOrder.total}<br>` +
      `<br>` +
      `<b>Agent Information</b><br>` +
      `Bank Name: ${lpBankAccount.bankName}<br>` +
      `Bank Account Name: ${lpBankAccount.bankAccountName}<br>` +
      `Bank Account Number: ${lpBankAccount.bankAccountNumber}<br>`

    const ticketFields: ICreateTicketInput = {
      subject: `Purchase Order #${order.referenceNumber}${env}`,
      description: description,
      type: this.freshdeskConfig.fields.general.TYPE.choices.OPERATIONS,
      email: this.freshdeskConfig.systemContactEmail,
      priority: FreshdeskTicketPriority.Low,
      status: FreshdeskTicketStatus.WaitingOnCustomer,
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

    const order = await this.orderEntityService.getOne({ id: transaction.orderId })
    if (!order) {
      throw new Error(`precondition failed: order not found`)
    }

    const purchaseOrder = await this.purchaseOrderEntityService.getOne({ orderId: transaction.orderId })
    if (!purchaseOrder) {
      throw new Error(`precondition failed: purchase order not found`)
    }

    const user = await this.userEntityService.getOne({ id: order.userId })
    if (!user) {
      throw new Error(`precondition failed: user not found`)
    }

    const changedBy = `transaction:${transaction.uid}`
    switch (transactionStatus.status) {
      case TransactionStatus.Created:
      case TransactionStatus.Pending: {
        break
      }
      case TransactionStatus.Completed:
        {
          const orderStatus = await this.poStatusService.cryptoCredited(order.id, changedBy)

          if (orderStatus) {
            try {
              await this.activityService.updatePOActivity(
                order.id,
                <PurchaseOrderStatus>orderStatus.status,
                PurchaseOrderStatusReason.None,
                user.fireUserId,
              )

              const ticket = await this.orderHelpdeskTicketEntityService.getOne({
                orderId: order.id,
                ticketType: FreshdeskTicketType.Operations,
              })

              if (ticket) {
                await this.freshdeskService.createNote(
                  ticket.ticketId,
                  {
                    body: 'Purchase Order Status: Crypto Credited',
                  },
                  true,
                )
              } else {
                this.logger.error(`unexpected: freshdesk ticket for order:${order.uid} was not found`)
              }

              const hasCompletePurchaseOrder = await this.userOrderService.hasCompletePurchaseOrder(user.id, [order.id])
              if (!hasCompletePurchaseOrder) {
                await this.pushService.send(user, {
                  title: `Congratulations! You just started saving in digital dollars 🎉`,
                  body: `You’ve just taken the first step to protect yourself from inflation and secure your future. We’re rooting for you!`,
                })
              } else {
                const formattedAmount = USDC(purchaseOrder.totalUsdc, false) // Do not use currency symbol here
                await this.pushService.send(user, {
                  title: `You successfully saved ${formattedAmount}! 🎉`,
                  body: `Congratulations! You successfully saved ${formattedAmount}! You’re taking the right step towards protecting yourself from inflation`,
                })
              }
            } catch (err: any) {
              const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
              this.logger.error(errorMessage)
            }
          }

          this.userBalanceService.notifyUserBalance(user.id)
        }
        break
      case TransactionStatus.Failed:
      case TransactionStatus.Exception:
        {
          const orderStatus = await this.poStatusService.failed(order.id, changedBy)

          try {
            await this.activityService.updatePOActivity(
              order.id,
              <PurchaseOrderStatus>orderStatus.status,
              PurchaseOrderStatusReason.None,
              user.fireUserId,
            )

            await this.reopenOrderTicketForAction(
              order.id,
              'The underlying USDC transaction has failed. Please re-confirm this order.',
            )
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }
        }
        break
      default:
        throw new Error(`unsupported: transaction status ${transactionStatus.status} not supported`)
    }
  }

  private async reopenOrderTicketForAction(orderId: number, message: string): Promise<void> {
    const ticket = await this.orderHelpdeskTicketEntityService.getOne({
      orderId: orderId,
      ticketType: FreshdeskTicketType.Operations,
    })

    if (ticket) {
      const custom_fields = {}
      custom_fields[`${this.freshdeskConfig.fields.purchase_order.ACTION.name}`] = null

      await this.freshdeskService.updateTicket(ticket.ticketId, {
        status: FreshdeskTicketStatus.Open,
        priority: FreshdeskTicketPriority.High,
        custom_fields: custom_fields,
      })

      await this.freshdeskService.createNote(
        ticket.ticketId,
        {
          body: message,
        },
        true,
      )
    } else {
      this.logger.error(`unexpected: freshdesk ticket for order:${orderId} was not found`)
    }
  }
}
