2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('user_bank_account')
export class UserBankAccountModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField('user_id')
  userId!: number

  @dbField('bank_id')
  bankId!: number

  @dbField('bank_account_number')
  bankAccountNumber!: string

  @dbField({ name: 'bank_account_name', model: String, nullable: true })
  bankAccountName!: string | null

  @dbField('bank_account_number_public')
  bankAccountNumberPublic!: string

  @dbField({ name: 'created_by', model: String, nullable: true })
  createdBy!: string | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const UserBankAccountEntityServiceSymbol = Symbols.serviceFor(UserBankAccountModel)

export interface IUserBankAccountEntityService
  extends IEntityService<UserBankAccountModel, 'id', 'id' | 'uid' | 'updatedAt' | 'createdAt', 'createdBy'> {}
