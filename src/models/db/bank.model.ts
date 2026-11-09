2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('bank')
export class BankModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField
  name!: string

  @dbField({ name: 'bank_code' })
  bankCode!: string

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const BankEntityServiceSymbol = Symbols.serviceFor(BankModel)

export interface IBankEntityService
  extends IEntityService<BankModel, 'id', 'id' | 'uid' | 'createdAt' | 'updatedAt', never> {}
