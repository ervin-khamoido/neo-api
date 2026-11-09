2021

import { dbField, dbTable } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('user_level_limit')
export class UserLevelLimitModel {
  @dbField({ primaryKey: true, name: 'user_level_id', readonly: true })
  userLevelId!: string

  /**
   * @deprecated Daily limits will be calculated using the 1, 7, and 30 day limits
   */
  @dbField({ name: 'daily_buy_limit', model: Number, nullable: true })
  dailyBuyLimit!: number | null

  /**
   * @deprecated Daily limits will be calculated using the 1, 7, and 30 day limits
   */
  @dbField({ name: 'daily_sell_limit', model: Number, nullable: true })
  dailySellLimit!: number | null

  /**
   * @deprecated Max limits will be calculated using the new daily and combined limits
   */
  @dbField({ name: 'max_buy_limit', model: Number, nullable: true })
  maxBuyLimit!: number | null

  @dbField({ name: 'buy_1day_limit_usdc', model: Number, nullable: true })
  buy1DayLimitUsdc!: number | null

  @dbField({ name: 'buy_7day_limit_usdc', model: Number, nullable: true })
  buy7DayLimitUsdc!: number | null

  @dbField({ name: 'buy_30day_limit_usdc', model: Number, nullable: true })
  buy30DayLimitUsdc!: number | null

  @dbField({ name: 'sell_1day_limit_usdc', model: Number, nullable: true })
  sell1DayLimitUsdc!: number | null

  @dbField({ name: 'sell_7day_limit_usdc', model: Number, nullable: true })
  sell7DayLimitUsdc!: number | null

  @dbField({ name: 'sell_30day_limit_usdc', model: Number, nullable: true })
  sell30DayLimitUsdc!: number | null

  @dbField({ name: 'send_1day_limit_usdc', model: Number, nullable: true })
  send1DayLimitUsdc!: number | null

  @dbField({ name: 'send_7day_limit_usdc', model: Number, nullable: true })
  send7DayLimitUsdc!: number | null

  @dbField({ name: 'send_30day_limit_usdc', model: Number, nullable: true })
  send30DayLimitUsdc!: number | null

  @dbField({ name: 'send_compliance_transaction_limit_usdc', model: Number, nullable: true })
  sendComplianceTransactionLimitUsdc!: number | null

  @dbField({ name: 'receive_1day_limit_usdc', model: Number, nullable: true })
  receive1DayLimitUsdc!: number | null

  @dbField({ name: 'receive_7day_limit_usdc', model: Number, nullable: true })
  receive7DayLimitUsdc!: number | null

  @dbField({ name: 'receive_30day_limit_usdc', model: Number, nullable: true })
  receive30DayLimitUsdc!: number | null

  @dbField({ name: 'receive_compliance_transaction_limit_usdc', model: Number, nullable: true })
  receiveComplianceTransactionLimitUsdc!: number | null

  @dbField({ name: 'combined_turnover_limit_usdc', model: Number, nullable: true })
  combinedTurnoverLimitUsdc!: number | null

  @dbField({ name: 'created_by' })
  createdBy!: string

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserLevelLimitEntityServiceSymbol = Symbols.serviceFor(UserLevelLimitModel)

export interface IUserLevelLimitEntityService
  extends IEntityService<UserLevelLimitModel, 'userLevelId', 'createdAt' | 'updatedAt', never> {}
