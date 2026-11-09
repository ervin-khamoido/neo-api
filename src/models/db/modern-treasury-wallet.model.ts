2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum MTNormalBalanceType {
  Credit = 'credit',
  Debit = 'debit',
}

@dbTable('modern_treasury_wallet')
export class ModernTreasuryWalletModel {
  @dbField({ primaryKey: true, name: 'wallet_id' })
  walletId!: string

  @dbField('ledger_id')
  ledgerId!: string

  @dbField('ledger_account_id')
  ledgerAccountId!: string

  @dbField('normal_balance')
  normalBalance!: MTNormalBalanceType

  @dbField
  name!: string

  @dbField({ nullable: true, model: String })
  description!: string | null

  @dbField
  object!: string

  @dbField({ name: 'callback_url', model: String, nullable: true })
  callbackUrl!: string | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const ModernTreasuryWalletEntityServiceSymbol = Symbols.serviceFor(ModernTreasuryWalletModel)

export interface IModernTreasuryWalletEntityService
  extends IEntityService<ModernTreasuryWalletModel, 'walletId', 'createdAt' | 'updatedAt', never> {}
