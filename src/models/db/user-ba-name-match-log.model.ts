2023

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_JSON } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum UserBaNameMatchLogSourceEnum {
  Validate = 'validate_bank_account',
  AddBankAccount = 'add_bank_account',
  UpdateFullName = 'update_full_name',
}

type UserNameDetails = {
  fullName?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
}

type BankAccountDetails = {
  bankId: number
  bankCode: string
  bankAccountNumber: string
}

@dbTable('user_ba_name_match_log')
export class UserBaNameMatchLogModel {
  @dbField({ primaryKey: true })
  id!: number

  @dbField({ name: 'user_id' })
  userId!: number

  @dbField({ name: 'source', model: String })
  source!: UserBaNameMatchLogSourceEnum

  @dbField({ name: 'user_name', kind: DB_JSON, model: Object })
  userName!: UserNameDetails

  @dbField({ name: 'bank_account_details', kind: DB_JSON, model: Object, nullable: true })
  bankAccountDetails?: BankAccountDetails | null
  @dbField({ name: 'response', kind: DB_JSON, model: Object, nullable: true })
  response?: any | null
  @dbField({ name: 'match', nullable: true, model: Boolean })
  match?: boolean | null
  @dbField({ name: 'match_details', kind: DB_JSON, model: Object, nullable: true })
  matchDetails?: any | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserBaNameMatchLogEntityServiceSymbol = Symbols.serviceFor(UserBaNameMatchLogModel)

export interface IUserBaNameMatchLogEntityService
  extends IEntityService<
    UserBaNameMatchLogModel,
    'id',
    'id' | 'updatedAt' | 'createdAt',
    'bankAccountDetails' | 'response' | 'match' | 'matchDetails'
  > {}
