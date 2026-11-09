2021

import { dbTable, dbField, reader } from '@ts-awesome/orm'
import { EntityService, IEntityService, Symbols } from '@ts-awesome/entity'
import { ISqlQuery } from '@ts-awesome/orm-pg/dist/interfaces'

export enum PurchaseOrderStatus {
  Created = 'created',
  PaymentSent = 'payment_sent',
  Confirmed = 'confirmed',
  Failed = 'failed',
  CryptoCredited = 'crypto_credited',
  Cancelled = 'cancelled',
  PaymentNotReceived = 'payment_not_received',
  Refunded = 'refunded',
}

export enum PurchaseOrderStatusReason {
  None = '',
  WrongAmount = 'wrong_amount',
  Expired = 'expired',
  OperationsRetry = 'operations_retry',
}

export enum SellOrderStatus {
  Created = 'created',
  CryptoTransferred = 'crypto_transferred',
  PaymentSent = 'payment_sent',
  PaymentConfirmedByUser = 'payment_confirmed',
  RefundInitiated = 'refund_initiated',
  Refunded = 'refunded',
  RefundFailed = 'refund_failed',
  TransferFailed = 'transfer_failed',
  Cancelled = 'cancelled',
}

export enum SellOrderStatusReason {
  None = '',
  Refunded = 'refunded',
  FailedWithdrawing = 'failed_withdrawing',
}

export enum YieldOrderStatus {
  Completed = 'completed',
}

export enum RewardOrderStatus {
  Created = 'created',
  Completed = 'completed',
  Failed = 'failed',
}

export enum TransferOrderStatus {
  Created = 'created',
  Completed = 'completed',
  Failed = 'failed',
}

export enum CardOrderStatus {
  Created = 'created',
  Pending = 'pending',
  Completed = 'completed',
  Failure = 'failure',
}

export enum OnChainOrderStatus {
  Created = 'created',
  Pending = 'pending',
  Completed = 'completed',
  Failure = 'failure',
}

@dbTable('order_status')
export class OrderStatusModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'status' })
  status!:
    | PurchaseOrderStatus
    | SellOrderStatus
    | YieldOrderStatus
    | RewardOrderStatus
    | TransferOrderStatus
    | CardOrderStatus
    | OnChainOrderStatus

  @dbField({ name: 'status_reason' })
  statusReason!: string

  @dbField({ name: 'changed_by' })
  changedBy!: string

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const OrderStatusEntityServiceSymbol = Symbols.serviceFor(OrderStatusModel)

export interface IOrderStatusEntityService
  extends IEntityService<OrderStatusModel, 'orderId', 'updatedAt' | 'createdAt', never> {
  getByOrderIdForUpdate(orderId: number): Promise<OrderStatusModel | null>
}

export class OrderStatusEntityService
  extends EntityService<OrderStatusModel, 'orderId', 'updatedAt' | 'createdAt', never, ISqlQuery>
  implements IOrderStatusEntityService {
  async getByOrderIdForUpdate(orderId: number): Promise<OrderStatusModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: 'SELECT * FROM "order_status" WHERE order_id=:orderId FOR UPDATE;',
      params: { orderId },
    })
    const result = reader(raw, OrderStatusModel, false)

    return result && result.length ? result[0] : null
  }
}
