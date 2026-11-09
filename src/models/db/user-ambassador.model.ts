2023

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('user_ambassador')
export class UserAmbassadorModel {
  @dbField({ name: 'user_id', primaryKey: true })
  userId!: number

  @dbField('ambassador_level_id')
  ambassadorLevelId!: number

  @dbField({ name: 'is_deleted' })
  isDeleted!: boolean

  @dbField({ name: 'created_by', model: String, nullable: true })
  createdBy!: string | null

  @dbField({ name: 'updated_by', model: String, nullable: true })
  updatedBy!: string | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const UserAmbassadorEntityServiceSymbol = Symbols.serviceFor(UserAmbassadorModel)

export interface IUserAmbassadorEntityService
  extends IEntityService<UserAmbassadorModel, 'userId', 'createdAt' | 'updatedAt', 'isDeleted'> {}
