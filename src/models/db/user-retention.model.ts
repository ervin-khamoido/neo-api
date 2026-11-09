2021

import { dbField, dbTable } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum UserRetentionStatus {
  Active = 'active',
  Fulfilled = 'fulfilled',
  Cancelled = 'cancelled',
}

@dbTable('user_retention')
export class UserRetentionModel {
  @dbField({ primaryKey: true, name: 'user_id' })
  userId!: number

  @dbField({ name: 'status' })
  status!: UserRetentionStatus

  @dbField({ name: 'status_reason', model: String, nullable: true })
  statusReason!: string | null

  @dbField({ name: 'retention_started_at' })
  retentionStartedAt!: Date

  @dbField({ name: 'retention_expires_at' })
  retentionExpiresAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserRetentionEntityServiceSymbol = Symbols.serviceFor(UserRetentionModel)

export interface IUserRetentionEntityService
  extends IEntityService<UserRetentionModel, 'userId', 'updatedAt' | 'createdAt', never> {}
