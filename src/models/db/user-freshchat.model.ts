2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export const UserFreshchatUniqueIndex = 'user_freshchat_pkey'

@dbTable('user_freshchat', [{ name: UserFreshchatUniqueIndex, fields: ['userId'] }])
export class UserFreshchatModel {
  @dbField({ name: 'user_id', primaryKey: true })
  userId!: number

  @dbField('restore_id')
  restoreId!: string

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserFreshchatEntityServiceSymbol = Symbols.serviceFor(UserFreshchatModel)

export interface IUserFreshchatEntityService
  extends IEntityService<UserFreshchatModel, 'userId', 'createdAt' | 'updatedAt', never> {}
