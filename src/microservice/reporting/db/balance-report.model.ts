2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'
import { DB_UID } from '@ts-awesome/orm-pg'

@dbTable('reporting.balance_report')
export class BalanceReportModel {
  @dbField({ name: 'user_id', primaryKey: true })
  userId!: number

  @dbField({ name: 'user_uid', kind: DB_UID })
  userUid!: string

  @dbField({ name: 'user_status' })
  userStatus!: string

  @dbField({ name: 'buy_exchange_rate' })
  buyExchangeRate!: number

  @dbField({ name: 'sell_exchange_rate' })
  sellExchangeRate!: number

  @dbField({ name: 'primary_wallet_balance_usdc' })
  primaryWalletBalanceUsdc!: number

  @dbField({ name: 'yield_wallet_balance_usdc' })
  yieldWalletBalanceUsdc!: number

  @dbField({ name: 'incoming_wallet_balance_usdc' })
  incomingWalletBalanceUsdc!: number

  @dbField({ name: 'active_card_uid', nullable: true, kind: DB_UID, model: String })
  activeCardUid!: string | null

  @dbField({ name: 'card_wallet_balance_usdc', nullable: true, model: Number })
  cardWalletBalanceUsdc!: number | null

  @dbField({ name: 'card_balance_bridgecard_cents', nullable: true, model: String })
  cardBalanceBridgecardCents!: string | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const BalanceReportEntityServiceSymbol = Symbols.serviceFor(BalanceReportModel)

export interface IBalanceReportEntityService
  extends IEntityService<BalanceReportModel, 'userId', 'createdAt' | 'updatedAt', never> {}
