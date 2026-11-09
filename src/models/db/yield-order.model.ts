2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'
import { DB_JSON } from '@ts-awesome/orm-pg'

@dbTable('yield_order')
export class YieldOrderModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'amount_usdc' })
  amountUsdc!: number

  @dbField({ name: 'amount' })
  amount!: number

  @dbField({ name: 'exchange_rate' })
  exchangeRate!: number

  @dbField({ name: 'from' })
  from!: string

  @dbField({ name: 'to_wallet_id' })
  toWalletId!: string

  @dbField({ nullable: true, model: String })
  name!: string | null

  @dbField
  code!: string

  @dbField({ name: 'start_period' })
  startPeriod!: Date

  @dbField({ name: 'end_period' })
  endPeriod!: Date

  @dbField({ name: 'average_interest_rate', nullable: true, model: Number })
  averageInterestRate!: number | null

  @dbField({ name: 'payload', kind: DB_JSON, model: Object, nullable: true })
  payload!: object | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const YieldOrderEntityServiceSymbol = Symbols.serviceFor(YieldOrderModel)

export interface IYieldOrderEntityService
  extends IEntityService<YieldOrderModel, 'orderId', 'createdAt' | 'updatedAt', never> {}
