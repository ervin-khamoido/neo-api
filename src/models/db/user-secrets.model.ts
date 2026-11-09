2021

import { dbField, dbTable } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('user_secrets')
export class UserSecretsModel {
  @dbField({ primaryKey: true, name: 'user_id' })
  userId!: number

  @dbField({ name: 'pin', model: String, nullable: true })
  pin!: string | null

  @dbField({ name: 'pin_attempts' })
  pinAttempts!: number

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserSecretsEntityServiceSymbol = Symbols.serviceFor(UserSecretsModel)

export interface IUserSecretsEntityService
  extends IEntityService<UserSecretsModel, 'userId', 'updatedAt' | 'createdAt', never> {}
