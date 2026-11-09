2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'
import { DB_UID } from '@ts-awesome/orm-pg'
import { WalletType } from '../modern-treasury'

@dbTable('wallet')
export class WalletModel {
  @dbField({ primaryKey: true, readonly: true })
  id!: string

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField
  type!: WalletType

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const WalletEntityServiceSymbol = Symbols.serviceFor(WalletModel)

export interface IWalletEntityService
  extends IEntityService<WalletModel, 'id', 'id' | 'uid' | 'createdAt' | 'updatedAt', never> {}
