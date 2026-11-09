2021
import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'
import { DB_JSON } from '@ts-awesome/orm-pg'
import { IPOCashbackCalculatorDetails } from '../cashback/cashback-details'

@dbTable('po_cashback_calculator_config')
export class POCashbackCalculatorConfigModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'external_uid' })
  externalUid!: string

  @dbField({ name: 'details', kind: DB_JSON, model: Object })
  details!: IPOCashbackCalculatorDetails

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const POCashbackCalculatorConfigEntityServiceSymbol = Symbols.serviceFor(POCashbackCalculatorConfigModel)

export interface IPOCashbackCalculatorConfigEntityService
  extends IEntityService<POCashbackCalculatorConfigModel, 'orderId', 'createdAt' | 'updatedAt', 'externalUid'> {}
