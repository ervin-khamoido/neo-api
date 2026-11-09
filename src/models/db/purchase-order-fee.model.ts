import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export interface IPurchaseOrderFeeDetails {
  percentageFee: number
  flatFee: number
  feeTotal: number
}

@dbTable('purchase_order_fee')
export class PurchaseOrderFeesModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'percentage_fee'})
  percentageFee!: number
  
  @dbField({ name: 'flat_fee' })
  flatFee!: number
  
  @dbField({ name: 'fee_total'})
  feeTotal!: number

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const PurchaseOrderFeesEntityServiceSymbol = Symbols.serviceFor(PurchaseOrderFeesModel)

export interface IPurchaseOrderFeesEntityService
  extends IEntityService<
    PurchaseOrderFeesModel,
    'orderId',
    'createdAt' | 'updatedAt',
    never
  > {}
