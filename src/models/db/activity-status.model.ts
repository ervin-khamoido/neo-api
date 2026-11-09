2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum PurchaseOrderActivityStatus {
  NewPurchase = 'new_purchase',
  PaymentSent = 'payment_sent',
  ConfirmingPayment = 'confirming_payment',
  PaymentConfirmed = 'payment_confirmed',
  ConvertingToUSDC = 'converting_to_usdc',
  USDCDeposited = 'usdc_deposited',
  Cancelled = 'cancelled',
  PaymentNotReceived = 'payment_not_received',
  Refunded = 'refunded',
}

export enum SellOrderActivityStatus {
  OrderPlaced = 'order_placed',
  WithdrawingUSDC = 'withdrawing_usdc',
  ConvertingUSDC = 'converting_usdc',
  TransferringNGN = 'transferring_ngn',
  TransferSuccessful = 'transfer_successful',
  Completed = 'completed',
  RefundingUSDC = 'refunding_usdc',
  Cancelled = 'cancelled',
}

export enum YieldOrderActivityStatus {
  Completed = 'completed',
}

export enum RewardOrderActivityStatus {
  Completed = 'completed',
}

export enum TransferOrderActivityStatus {
  Completed = 'completed',
  Failed = 'failed',
}

export enum CardOrderActivityStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
}

export enum OnChainOrderActivityStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
  Quarantine = 'quarantine',
}

export type ActivityStatus =
  | PurchaseOrderActivityStatus
  | SellOrderActivityStatus
  | YieldOrderActivityStatus
  | RewardOrderActivityStatus
  | TransferOrderActivityStatus
  | CardOrderActivityStatus
  | OnChainOrderActivityStatus

@dbTable('activity_status')
export class ActivityStatusModel {
  @dbField({ autoIncrement: true, primaryKey: true })
  id!: number

  @dbField({ name: 'activity_id' })
  activityId!: number

  @dbField
  status!: ActivityStatus

  @dbField({ name: 'status_reason', model: String, nullable: true })
  statusReason!: string | null

  @dbField('status_datetime')
  statusDatetime!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const ActivityStatusEntityServiceSymbol = Symbols.serviceFor(ActivityStatusModel)

export interface IActivityStatusEntityService
  extends IEntityService<ActivityStatusModel, 'id', 'id' | 'createdAt' | 'updatedAt', never> {}
