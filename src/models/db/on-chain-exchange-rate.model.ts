2023

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('on_chain_exchange_rate')
export class OnChainExchangeRateModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ name: 'exchange_rate' })
  exchangeRate!: string

  @dbField({ name: 'token' })
  token!: string

  @dbField({ name: 'created_by', model: String, nullable: true })
  createdBy!: string | null

  @dbField({ name: 'created_at' })
  createdAt!: Date

  @dbField({ name: 'updated_at' })
  updatedAt!: Date
}

export const OnChainExchangeRateEntityServiceSymbol = Symbols.serviceFor(OnChainExchangeRateModel)

export interface IOnChainExchangeRateEntityService
  extends IEntityService<OnChainExchangeRateModel, 'id', 'id' | 'uid' | 'createdAt' | 'updatedAt', never> {}
