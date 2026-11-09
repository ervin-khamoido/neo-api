2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export const UserPushTokenUniqueIndex = 'uq_user_push_token'

export enum Platform {
  iOS = 'ios',
  Android = 'android',
}

@dbTable('user_push', [{ name: UserPushTokenUniqueIndex, fields: ['token'] }])
export class UserPushModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ name: 'user_id' })
  userId!: number

  @dbField
  token!: string

  @dbField
  platform!: Platform

  @dbField
  device!: string

  @dbField({ name: 'expires_at' })
  expiresAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserPushEntityServiceSymbol = Symbols.serviceFor(UserPushModel)

export interface IUserPushEntityService
  extends IEntityService<UserPushModel, 'id', 'id' | 'createdAt' | 'updatedAt', never> {}
