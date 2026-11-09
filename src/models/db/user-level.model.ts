2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'
import { DB_UID } from '@ts-awesome/orm-pg'

export enum UserLevel {
  Level0 = 'level_0',
  Level1 = 'level_1',
  Level2 = 'level_2',
  Level3 = 'level_3',
}

export const UserLevels = Object.values(UserLevel)

export const UserLevelOrder: Record<UserLevel, number> = Object.freeze({
  [UserLevel.Level0]: 0,
  [UserLevel.Level1]: 1,
  [UserLevel.Level2]: 2,
  [UserLevel.Level3]: 3,
})

@dbTable('user_level')
export class UserLevelModel {
  @dbField({ primaryKey: true, readonly: true })
  id!: string

  @dbField({ model: String })
  code!: UserLevel

  @dbField
  name!: string

  @dbField({ name: 'kyc_level_id', model: Number, nullable: true })
  kycLevelId!: number | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserLevelEntityServiceSymbol = Symbols.serviceFor(UserLevelModel)

export interface IUserLevelEntityService
  extends IEntityService<UserLevelModel, 'id', 'id' | 'createdAt' | 'updatedAt', never> {}
