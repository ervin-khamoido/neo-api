2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('user_bank_account_config')
export class UserBankAccountConfigModel {
  @dbField({
    name: 'user_bank_id',
    primaryKey: true,
  })
  userBankId!: number

  @dbField('is_deleted')
  isDeleted!: boolean

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserBankAccountConfigEntityServiceSymbol = Symbols.serviceFor(UserBankAccountConfigModel)

export interface IUserBankAccountConfigEntityService
  extends IEntityService<UserBankAccountConfigModel, 'userBankId', 'createdAt' | 'updatedAt', never> {}
