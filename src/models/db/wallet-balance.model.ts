2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('wallet_balance')
export class WalletBalanceModel {
  @dbField({ primaryKey: true, name: 'wallet_id' })
  walletId!: string

  @dbField({ name: 'balance_usdc' })
  balanceUsdc!: number

  @dbField({ name: 'blocked_amount_usdc' })
  blockedAmountUsdc!: number

  @dbField({ primaryKey: true, name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const WalletBalanceEntityServiceSymbol = Symbols.serviceFor(WalletBalanceModel)

export interface IWalletBalanceEntityService
  extends IEntityService<WalletBalanceModel, 'walletId' | 'createdAt', 'walletId' | 'createdAt' | 'updatedAt', never> {}
