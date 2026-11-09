2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('sell_order_details')
export class SellOrderDetailsModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'bank_transaction_reference', nullable: true, model: String })
  bankTransactionReference!: string | null

  @dbField({ name: 'bank_transaction_amount', nullable: true, model: Number })
  bankTransactionAmount!: number | null

  @dbField({ name: 'changed_by', nullable: true, model: String })
  changedBy!: string | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const SellOrderDetailsEntityServiceSymbol = Symbols.serviceFor(SellOrderDetailsModel)

export interface ISellOrderDetailsEntityService
  extends IEntityService<
    SellOrderDetailsModel,
    'orderId',
    'createdAt' | 'updatedAt',
    'bankTransactionReference' | 'bankTransactionAmount' | 'changedBy'
  > {}
