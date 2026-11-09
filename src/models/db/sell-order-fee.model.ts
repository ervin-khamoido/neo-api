import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'


@dbTable('sell_order_fee')
export class SellOrderFeesModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'percentage_fee'})
  percentageFee!: number
  
  @dbField({ name: 'flat_fee'})
  flatFee!: number
  
  @dbField({ name: 'fee_total'})
  feeTotal!: number

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const SellOrderFeesEntityServiceSymbol = Symbols.serviceFor(SellOrderFeesModel)

export interface ISellOrderFeesEntityService
  extends IEntityService<
    SellOrderFeesModel,
    'orderId',
    'createdAt' | 'updatedAt',
    never
  > {}
