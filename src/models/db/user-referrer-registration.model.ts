2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('user_referrer_registration')
export class UserReferrerRegistrationModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ name: 'referrer_user_id' })
  referrerUserId!: number

  @dbField({ name: 'created_user_id' })
  createdUserId!: number

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserReferrerRegistrationEntityServiceSymbol = Symbols.serviceFor(UserReferrerRegistrationModel)

export interface IUserReferrerRegistrationEntityService
  extends IEntityService<UserReferrerRegistrationModel, 'id', 'id' | 'createdAt' | 'updatedAt', never> {}
