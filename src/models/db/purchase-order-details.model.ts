2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('purchase_order_details')
export class PurchaseOrderDetailsModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'bank_transaction_reference', nullable: true, model: String })
  bankTransactionReference!: string | null

  @dbField({ name: 'bank_transaction_amount', nullable: true, model: Number })
  bankTransactionAmount!: number | null

  @dbField({ name: 'refund_bank_transaction_reference', nullable: true, model: String })
  refundBankTransactionReference!: string | null

  @dbField({ name: 'refund_bank_transaction_amount', nullable: true, model: Number })
  refundBankTransactionAmount!: number | null

  @dbField({ name: 'bank_code', nullable: true, model: String })
  bankCode!: string | null

  @dbField({ name: 'changed_by', nullable: true, model: String })
  changedBy!: string | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const PurchaseOrderDetailsEntityServiceSymbol = Symbols.serviceFor(PurchaseOrderDetailsModel)

export interface IPurchaseOrderDetailsEntityService
  extends IEntityService<
    PurchaseOrderDetailsModel,
    'orderId',
    'createdAt' | 'updatedAt',
    | 'bankTransactionReference'
    | 'bankTransactionAmount'
    | 'refundBankTransactionReference'
    | 'refundBankTransactionAmount'
    | 'bankCode'
    | 'changedBy'
  > {}
