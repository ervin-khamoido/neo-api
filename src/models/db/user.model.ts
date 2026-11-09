2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID, DB_EMAIL } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('user')
export class UserModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField
  phone!: string

  @dbField({ kind: DB_EMAIL })
  email!: string

  @dbField({ name: 'fire_user_id' })
  fireUserId!: string

  @dbField({ name: 'token_nbf' })
  tokenNbf!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserEntityServiceSymbol = Symbols.serviceFor(UserModel)

export interface IUserEntityService
  extends IEntityService<UserModel, 'id', 'id' | 'uid' | 'createdAt' | 'updatedAt', 'tokenNbf'> {}
