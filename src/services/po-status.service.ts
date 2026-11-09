2021

import { inject, injectable } from 'inversify'

import { ConfigSymbol, IConfig } from '@ts-awesome/config'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  Currency,
  IModernTreasuryWalletEntityService,
  IOrderEntityService,
  IOrderStatusEntityService,
  IPurchaseOrderEntityService,
  IWalletEntityService,
  ModernTreasuryWalletEntityServiceSymbol,
  OrderEntityServiceSymbol,
  OrderStatusEntityServiceSymbol,
  OrderStatusModel,
  OrderType,
  PurchaseOrderEntityServiceSymbol,
  PurchaseOrderStatus,
  PurchaseOrderStatusReason,
  TransactionStatus,
  WalletEntityServiceSymbol,
} from '../models/db'
import { IOrderConfirmationResult } from '../models/response'

import { ITransactionService, TransactionServiceSymbol } from './transaction/transaction.service'
import { IModernTreasuryService, ModernTreasuryServiceSymbol } from './modern-treasury.service'

export class ApplicationError extends Error {
  constructor(message: string) {
    super(`unexpected error: ${message}`)
  }
}

export class OrderAlreadyHasCompletedTransactionError extends ApplicationError {
  constructor(orderId: number) {
    super(`order:${orderId} already has a completed transaction`)
  }
}

export interface IPOStatusService {
  create(orderId: number, user: string): Promise<OrderStatusModel>
  cancel(orderId: number, user: string): Promise<OrderStatusModel>
  confirm(orderId: number, confirmedBy: string): Promise<IOrderConfirmationResult>
  confirmRetry(orderId: number, confirmedBy: string): Promise<IOrderConfirmationResult>
  paymentSent(orderId: number, user: string): Promise<OrderStatusModel | null>
  cryptoCredited(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
  failed(orderId: number, changedBy: string): Promise<OrderStatusModel>
  paymentNotReceived(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
  refunded(
    orderId: number,
    changedBy: string,
    statusReason: PurchaseOrderStatusReason,
  ): Promise<OrderStatusModel | null>
  isCryptoCredited(orderId: number): Promise<boolean>
}

export const POStatusServiceSymbol = Symbol.for('IPOStatusService')

@injectable()
export class POStatusService implements IPOStatusService {
  private logger: ILogger

  @inject(ConfigSymbol) config!: IConfig
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService
  @inject(PurchaseOrderEntityServiceSymbol) purchaseOrderEntityService!: IPurchaseOrderEntityService
  @inject(WalletEntityServiceSymbol) walletEntityService!: IWalletEntityService
  @inject(ModernTreasuryWalletEntityServiceSymbol)
  modernTreasuryWalletEntityService!: IModernTreasuryWalletEntityService

  @inject(TransactionServiceSymbol) transactionService!: ITransactionService
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(POStatusService)
  }

  async create(orderId: number, user: string): Promise<OrderStatusModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.PurchaseOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getOne({ orderId })

    if (currentStatus) {
      throw new Error('precondition failed: status must be undefined')
    }

    const result = await this.orderStatusEntityService.addOne({
      orderId: orderId,
      status: PurchaseOrderStatus.Created,
      statusReason: '',
      changedBy: `user:${user}`,
    })

    return result!
  }

  async cancel(orderId: number, user: string): Promise<OrderStatusModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.PurchaseOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case PurchaseOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: PurchaseOrderStatus.Cancelled,
          statusReason: '',
          changedBy: `user:${user}`,
        })

        return result!
      }
      default:
        throw new Error('precondition failed: purchase order is in invalid state')
    }
  }

  async confirm(orderId: number, confirmedBy: string): Promise<IOrderConfirmationResult> {
    const purchaseOrder = await this.purchaseOrderEntityService.getOne({ orderId: orderId })
    if (!purchaseOrder) {
      throw new Error(`precondition failed: order id ${orderId} does not exist or has an invalid type`)
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for order id ${orderId}`)
    }

    const fromStatuses = [
      PurchaseOrderStatus.Created,
      PurchaseOrderStatus.PaymentSent,
      PurchaseOrderStatus.PaymentNotReceived,
    ]
    if (!fromStatuses.includes(<PurchaseOrderStatus>currentStatus.status)) {
      throw new Error(`precondition failed: status for order id ${orderId} is not in ${fromStatuses.toString()}`)
    }

    let orderStatus = await this.orderStatusEntityService.updateOne({
      orderId: orderId,
      status: PurchaseOrderStatus.Confirmed,
      changedBy: confirmedBy,
    })

    const [fromWallet, toWallet] = await Promise.all([
      this.modernTreasuryWalletEntityService.getOne({ walletId: purchaseOrder.fromWalletId }),
      this.modernTreasuryWalletEntityService.getOne({ walletId: purchaseOrder.toWalletId }),
    ])

    if (!fromWallet) {
      throw new Error('precondition failed: LP wallet was not found')
    }

    if (!toWallet) {
      throw new Error('precondition failed: user wallet was not found')
    }

    const [, transactionStatusChangeResult] = await this.transactionService.createTransaction({
      orderId: purchaseOrder.orderId,
      source: fromWallet.ledgerAccountId,
      dest: toWallet.ledgerAccountId,
      amount: purchaseOrder.totalUsdc,
      createdBy: confirmedBy,
      currency: Currency.USDC,
    })

    const { transactionStatus, changed } = transactionStatusChangeResult

    if (transactionStatus.status !== TransactionStatus.Pending) {
      return {
        orderStatus: null,
        transactionStatusChangeResult: transactionStatusChangeResult,
      }
    }

    return {
      orderStatus: orderStatus,
      transactionStatusChangeResult: transactionStatusChangeResult,
    }
  }

  async confirmRetry(orderId: number, confirmedBy: string): Promise<IOrderConfirmationResult> {
    const purchaseOrder = await this.purchaseOrderEntityService.getOne({ orderId: orderId })
    if (!purchaseOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    if (currentStatus.status !== PurchaseOrderStatus.Failed) {
      throw new Error(`precondition failed: order is not in failed status, cannot retry`)
    }

    // Check if there is a transaction attached to the order
    const [latestTransaction, latestTransactionStatus] = await this.transactionService.getLatestTransactionByOrderId(
      orderId,
    )

    let parentTransactionId = null
    if (latestTransaction) {
      // Check if any transactions are not in a failed status - if not, we should re-open the ticket
      const hasNonFailedTransactions = await this.transactionService.hasNonFailedTransactions(orderId)
      if (hasNonFailedTransactions) {
        throw new OrderAlreadyHasCompletedTransactionError(orderId)
      }

      // Check if latest failed transaction in DB has a corresponding transaction in MT
      // If there is one transaction in MT update transaction in our DB
      // If there multiple transactions raise an exception
      // If none - proceed to creating a new transaction
      const mtTransactions = await this.modernTreasuryService.findTransactionsByExternalId(latestTransaction.uid)
      if (mtTransactions && mtTransactions.length === 1) {
        const modernTreasuryTransaction = mtTransactions[0]

        const orderStatus = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: PurchaseOrderStatus.Confirmed,
          statusReason: PurchaseOrderStatusReason.OperationsRetry,
          changedBy: confirmedBy,
        })

        const restorePendingTransactions = await this.transactionService.restorePending(
          latestTransaction.id,
          modernTreasuryTransaction,
        )

        return {
          orderStatus: orderStatus,
          transactionStatusChangeResult: restorePendingTransactions,
        }
      } else if ((mtTransactions?.length ?? 0) > 1) {
        throw new Error(
          `unexpected: transaction ${latestTransaction.uid} has multiple corresponding transaction in ModernTreasury`,
        )
      } else {
        parentTransactionId = latestTransaction.id
      }
    }

    let orderStatus = await this.orderStatusEntityService.updateOne({
      orderId: orderId,
      status: PurchaseOrderStatus.Confirmed,
      statusReason: PurchaseOrderStatusReason.OperationsRetry,
      changedBy: confirmedBy,
    })

    const [fromWallet, toWallet] = await Promise.all([
      this.modernTreasuryWalletEntityService.getOne({ walletId: purchaseOrder.fromWalletId }),
      this.modernTreasuryWalletEntityService.getOne({ walletId: purchaseOrder.toWalletId }),
    ])

    if (!fromWallet) {
      throw new Error('precondition failed: LP wallet was not found')
    }

    if (!toWallet) {
      throw new Error('precondition failed: user wallet was not found')
    }

    const [, transactionStatusChangeResult] = await this.transactionService.createTransaction({
      orderId: purchaseOrder.orderId,
      source: fromWallet.ledgerAccountId,
      dest: toWallet.ledgerAccountId,
      amount: purchaseOrder.totalUsdc,
      createdBy: confirmedBy,
      currency: Currency.USDC,
      parentTransactionId: parentTransactionId,
    })

    const { transactionStatus, changed } = transactionStatusChangeResult

    if (transactionStatus.status !== TransactionStatus.Pending) {
      return {
        orderStatus: null,
        transactionStatusChangeResult: transactionStatusChangeResult,
      }
    }

    return {
      orderStatus: orderStatus,
      transactionStatusChangeResult: transactionStatusChangeResult,
    }
  }

  async paymentSent(orderId: number, user: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.PurchaseOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case PurchaseOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: PurchaseOrderStatus.PaymentSent,
          statusReason: '',
          changedBy: `user:${user}`,
        })

        return result!
      }
      case PurchaseOrderStatus.PaymentSent: {
        this.logger.warn('skipping payment sent updates: purchase order is in payment sent status')
        return null
      }
      case PurchaseOrderStatus.Confirmed: {
        this.logger.warn('skipping payment sent updates: purchase order is in confirmed status')
        return null
      }
      case PurchaseOrderStatus.CryptoCredited: {
        this.logger.warn('skipping payment sent updates: purchase order is in credited status')
        return null
      }
      default:
        throw new Error('precondition failed: purchase order is in invalid state')
    }
  }

  async cryptoCredited(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.PurchaseOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case PurchaseOrderStatus.Confirmed: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: PurchaseOrderStatus.CryptoCredited,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case PurchaseOrderStatus.CryptoCredited: {
        this.logger.warn('skipping payment sent updates: purchase order is in credited status')
        return null
      }
      default:
        throw new Error('precondition failed: purchase order is in invalid state')
    }
  }

  async failed(orderId: number, changedBy: string): Promise<OrderStatusModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.PurchaseOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case PurchaseOrderStatus.Confirmed: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: PurchaseOrderStatus.Failed,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      default:
        throw new Error('precondition failed: purchase order is in invalid state')
    }
  }

  async paymentNotReceived(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.PurchaseOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case PurchaseOrderStatus.Created:
      case PurchaseOrderStatus.PaymentSent: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: PurchaseOrderStatus.PaymentNotReceived,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case PurchaseOrderStatus.PaymentNotReceived: {
        this.logger.warn('skipping updates: purchase order is already in payment not received status')
        return null
      }
      default:
        throw new Error('precondition failed: purchase order is in invalid state')
    }
  }

  async refunded(
    orderId: number,
    changedBy: string,
    statusReason: PurchaseOrderStatusReason,
  ): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.PurchaseOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case PurchaseOrderStatus.Created:
      case PurchaseOrderStatus.PaymentSent:
      case PurchaseOrderStatus.PaymentNotReceived: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: PurchaseOrderStatus.Refunded,
          statusReason: statusReason,
          changedBy: changedBy,
        })

        return result!
      }
      case PurchaseOrderStatus.Refunded: {
        this.logger.warn('skipping updates: purchase order is already in refunded status')
        return null
      }
      default:
        throw new Error('precondition failed: purchase order is in invalid state')
    }
  }

  async isCryptoCredited(orderId: number): Promise<boolean> {
    const orderStatus = await this.orderStatusEntityService.getOne({ orderId: orderId })

    if (!orderStatus) {
      throw new Error('precondition failed: order status not found')
    }

    return orderStatus.status === PurchaseOrderStatus.CryptoCredited
  }
}
