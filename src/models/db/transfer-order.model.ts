2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('transfer_order')
export class TransferOrderModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'amount_usdc' })
  amountUsdc!: number

  @dbField({ name: 'amount', model: Number, nullable: true })
  amount!: number | null

  @dbField({ name: 'exchange_rate', model: Number, nullable: true })
  exchangeRate!: number | null

  @dbField({ name: 'from_wallet_id' })
  fromWalletId!: string

  @dbField({ name: 'from_user_id' })
  fromUserId!: number

  @dbField()
  from!: string

  @dbField({ name: 'to_user_id' })
  toUserId!: number

  @dbField()
  to!: string

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const TransferOrderEntityServiceSymbol = Symbols.serviceFor(TransferOrderModel)

export interface ITransferOrderEntityService
  extends IEntityService<TransferOrderModel, 'orderId', 'createdAt' | 'updatedAt', never> {}
