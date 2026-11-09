2021

import { ConfigSymbol, IConfig } from '@ts-awesome/config'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { inject, injectable } from 'inversify'

import {
  Currency,
  IModernTreasuryWalletEntityService,
  IOrderEntityService,
  IOrderStatusEntityService,
  ISellOrderEntityService,
  ModernTreasuryWalletEntityServiceSymbol,
  OrderEntityServiceSymbol,
  OrderStatusEntityServiceSymbol,
  OrderStatusModel,
  OrderType,
  SellOrderEntityServiceSymbol,
  SellOrderStatus,
  TransactionStatus,
  TransactionStatusModel,
} from '../models/db'
import { ITransactionService, TransactionServiceSymbol } from './transaction/transaction.service'

export interface ISOStatusService {
  create(orderId: number, user: string): Promise<OrderStatusModel>
  transferFailed(orderId: number, user: string): Promise<OrderStatusModel>
  cryptoTransferred(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
  paymentSent(orderId: number, paymentSentBy: string): Promise<OrderStatusModel | null>
  paymentConfirmedByUser(orderId: number, user: string): Promise<OrderStatusModel | null>
  cancelled(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
  refundInitiated(orderId: number, changedBy: string): Promise<[OrderStatusModel | null, TransactionStatusModel | null]>
  refunded(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
}

export const SOStatusServiceSymbol = Symbol.for('ISOStatusService')

@injectable()
export class SOStatusService implements ISOStatusService {
  private logger: ILogger

  @inject(ConfigSymbol) config!: IConfig

  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService
  @inject(ModernTreasuryWalletEntityServiceSymbol)
  modernTreasuryWalletEntityService!: IModernTreasuryWalletEntityService
  @inject(SellOrderEntityServiceSymbol) sellOrderEntityService!: ISellOrderEntityService

  @inject(TransactionServiceSymbol) transactionService!: ITransactionService

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(SOStatusService)
  }

  async create(orderId: number, user: string): Promise<OrderStatusModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.SellOrder) {
      throw new Error('precondition failed: order does not exist or has an invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getOne({ orderId: orderId })
    if (currentStatus) {
      throw new Error('precondition failed: status must be undefined')
    }

    const result = await this.orderStatusEntityService.addOne({
      orderId: orderId,
      status: SellOrderStatus.Created,
      statusReason: '',
      changedBy: `user:${user}`,
    })

    return result!
  }

  async transferFailed(orderId: number, user: string): Promise<OrderStatusModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.SellOrder) {
      throw new Error('precondition failed: order does not exist or has an invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status must exist')
    }

    switch (currentStatus.status) {
      case SellOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: SellOrderStatus.TransferFailed,
          changedBy: `user:${user}`,
        })

        return result!
      }
      default:
        throw new Error('precondition failed: purchase order is in invalid state')
    }
  }

  async paymentSent(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.SellOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case SellOrderStatus.CryptoTransferred: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: SellOrderStatus.PaymentSent,
          statusReason: '',
          changedBy: `${changedBy}`,
        })

        return result!
      }
      case SellOrderStatus.PaymentSent: {
        this.logger.warn('skipping payment sent updates: sell order is already in payment sent status')
        return null
      }
      default:
        throw new Error('precondition failed: sell order is in invalid state')
    }
  }

  async cryptoTransferred(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.SellOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case SellOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: SellOrderStatus.CryptoTransferred,
          statusReason: '',
          changedBy: `${changedBy}`,
        })

        return result!
      }
      case SellOrderStatus.CryptoTransferred: {
        this.logger.warn('skipping crypto transferred updates: sell order is already in a crypto transferred status')
        return null
      }
      default:
        throw new Error('precondition failed: sell order is in invalid state')
    }
  }

  async paymentConfirmedByUser(orderId: number, user: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.SellOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case SellOrderStatus.PaymentSent: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: SellOrderStatus.PaymentConfirmedByUser,
          statusReason: '',
          changedBy: `user:${user}`,
        })

        return result!
      }
      case SellOrderStatus.PaymentConfirmedByUser: {
        this.logger.warn('skipping payment sent updates: sell order is already in payment sent status')
        return null
      }
      default:
        throw new Error('precondition failed: sell order is in invalid state')
    }
  }

  async cancelled(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.SellOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case SellOrderStatus.Created: // TODO: Remove this line when we release transfer retries
      case SellOrderStatus.TransferFailed: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: SellOrderStatus.Cancelled,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case SellOrderStatus.Cancelled: {
        this.logger.warn('skipping cancelled updates: sell order is already in cancelled status')
        return null
      }
      default:
        throw new Error('precondition failed: sell order is in invalid state')
    }
  }

  async refundInitiated(
    orderId: number,
    changedBy: string,
  ): Promise<[OrderStatusModel | null, TransactionStatusModel | null]> {
    const [order, sellOrder] = await Promise.all([
      this.orderEntityService.getOne({ id: orderId }),
      this.sellOrderEntityService.getOne({ orderId: orderId }),
    ])

    if (!order || order.orderType !== OrderType.SellOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    if (!sellOrder) {
      throw new Error('precondition failed: sell order not exists')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    const fromStatuses = [SellOrderStatus.CryptoTransferred]
    if (!fromStatuses.includes(<SellOrderStatus>currentStatus.status)) {
      throw new Error(`precondition failed: status is not in ${fromStatuses.toString()}`)
    }

    let orderStatus = await this.orderStatusEntityService.updateOne({
      orderId: orderId,
      status: SellOrderStatus.RefundInitiated,
      statusReason: '',
      changedBy: changedBy,
    })

    const [userWallet, lpWallet] = await Promise.all([
      this.modernTreasuryWalletEntityService.getOne({ walletId: sellOrder.fromWalletId }),
      this.modernTreasuryWalletEntityService.getOne({ walletId: sellOrder.toWalletId }),
    ])

    if (!userWallet) {
      throw new Error('precondition failed: User wallet was not found')
    }

    if (!lpWallet) {
      throw new Error('precondition failed: LP wallet was not found')
    }

    const [, transactionStatusChangeResult] = await this.transactionService.createTransaction({
      orderId: sellOrder.orderId,
      source: lpWallet.ledgerAccountId,
      dest: userWallet.ledgerAccountId,
      amount: sellOrder.totalUsdc,
      createdBy: changedBy,
      currency: Currency.USDC,
    })

    const { transactionStatus, changed } = transactionStatusChangeResult
    if (transactionStatus.status !== TransactionStatus.Pending) {
      orderStatus = await this.orderStatusEntityService.updateOne({
        orderId: orderId,
        status: SellOrderStatus.RefundFailed,
        statusReason: `transfer_status:${transactionStatus.status}`,
        changedBy: changedBy,
      })

      this.logger.error(`critical: unexpected transfer status ${transactionStatus.status} for order:${order.uid}`)

      return [null, transactionStatus]
    }

    return [orderStatus, transactionStatus]
  }

  async refunded(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.SellOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case SellOrderStatus.RefundInitiated: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: SellOrderStatus.Refunded,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case SellOrderStatus.Refunded: {
        this.logger.warn('skipping refunded updates: sell order is already in refunded status')
        return null
      }
      default:
        throw new Error('precondition failed: sell order is in invalid state')
    }
  }
}
