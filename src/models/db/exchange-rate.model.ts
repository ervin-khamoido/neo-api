2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('exchange_rate')
export class ExchangeRateModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ name: 'external_uid' })
  externalUid!: string

  @dbField({ name: 'buy_exchange_rate' })
  buyExchangeRate!: number

  @dbField({ name: 'sell_exchange_rate' })
  sellExchangeRate!: number

  @dbField({ name: 'applies_at' })
  appliesAt!: Date

  @dbField
  source!: string

  @dbField({ name: 'created_at' })
  createdAt!: Date

  @dbField({ name: 'updated_at' })
  updatedAt!: Date
}

export const ExchangeRateEntityServiceSymbol = Symbols.serviceFor(ExchangeRateModel)

export interface IExchangeRateEntityService extends IEntityService<ExchangeRateModel, 'id', 'id' | 'uid', never> {}
