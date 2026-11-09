2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('liquidity_provider_bank_account')
export class LiquidityProviderBankAccountModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ name: 'liquidity_provider_id' })
  liquidityProviderId!: number

  @dbField({ name: 'bank_name' })
  bankName!: string

  @dbField({ name: 'bank_account_number' })
  bankAccountNumber!: string

  @dbField({ name: 'bank_account_name', nullable: true, model: String })
  bankAccountName!: string | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const LPBankAccountEntityServiceSymbol = Symbols.serviceFor(LiquidityProviderBankAccountModel)

export interface ILPBankAccountEntityService
  extends IEntityService<LiquidityProviderBankAccountModel, 'id', 'id' | 'uid' | 'updatedAt' | 'createdAt', never> {}
