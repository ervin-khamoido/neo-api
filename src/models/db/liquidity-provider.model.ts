2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('liquidity_provider')
export class LiquidityProviderModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ name: 'name' })
  name!: string

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const LiquidityProviderEntityServiceSymbol = Symbols.serviceFor(LiquidityProviderModel)

export interface ILiquidityProviderEntityService
  extends IEntityService<LiquidityProviderModel, 'id', 'id' | 'uid' | 'updatedAt' | 'createdAt', never> {}
