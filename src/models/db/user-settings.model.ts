2021

import { dbField, dbTable } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum CurrencyType {
  USD = 'USD',
  NGN = 'NGN',
}

@dbTable('user_settings')
export class UserSettingsModel {
  @dbField({ primaryKey: true, name: 'user_id' })
  userId!: number

  @dbField({ name: 'dark_mode' })
  darkMode!: boolean

  @dbField({ name: 'default_currency' })
  defaultCurrency!: CurrencyType

  @dbField({ name: 'enable_app_lock' })
  enableAppLock!: boolean

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserSettingsEntityServiceSymbol = Symbols.serviceFor(UserSettingsModel)

export interface IUserSettingsEntityService
  extends IEntityService<UserSettingsModel, 'userId', 'updatedAt' | 'createdAt', never> {}
