import { inject, injectable } from 'inversify'
import { ICashbackBuyConfig } from '../../models/cashback/cashback-buy.config'
import { cache, CacheKey } from '../../utils/cache-util'
import { AirtableServiceSymbol, IAirtableService } from '../airtable.service'

export interface ICashbackConfigService {
  getConfig(): Promise<ICashbackBuyConfig>
}

export const CashbackConfigServiceSymbol = Symbol.for('ICashbackConfigService')

@injectable()
export class CashbackConfigService implements ICashbackConfigService {
  @inject(AirtableServiceSymbol) airtableService!: IAirtableService

  @cache(CacheKey.CashbackConfig)
  async getConfig(): Promise<ICashbackBuyConfig> {
    const now = new Date()
    const cashbackConfig = await this.airtableService.getCashbackForDate(now)

    if (!cashbackConfig) {
      throw new Error('precondition failed: valid cashback config not available')
    }

    return {
      externalUid: cashbackConfig.id,
      winPercentage: cashbackConfig.win_percentage,
      maxWinAmountValue: cashbackConfig.max_win_amount_value,
      maxWinAmountPercentage: cashbackConfig.max_win_amount_percentage,
      minWinAmountPercentage: cashbackConfig.min_win_amount_percentage,
      startDate: cashbackConfig.start_datetime,
      createdDate: cashbackConfig.created_datetime,
      endDate: cashbackConfig.end_datetime,
      enabled: cashbackConfig.enabled,
      updatedDate: cashbackConfig.updated_datetime,
      version: 'v1',
    }
  }
}
