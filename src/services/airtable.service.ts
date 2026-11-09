2021

import { inject, injectable } from 'inversify'
import { formatISO } from 'date-fns'
import Airtable from 'airtable'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { AirtableConfigSymbol, IAirtableConfig } from '../models/config'
import {
  AirtableExchangeRate,
  AirtableLPBankAccountAvailability,
  AirtableLPBankAccountCreateAvailability,
  AirtableCashbackBuy,
  AirtableYieldApr,
} from '../models/airtable'
import { format } from 'date-fns-tz'

export interface IAirtableService {
  getExchangeRateAfter(date: Date): Promise<AirtableExchangeRate[]>
  getYieldAprForDate(date: Date): Promise<AirtableYieldApr | null>
  getYieldApr(): Promise<AirtableYieldApr[]>
  addLPBankAccountAvailability(
    model: AirtableLPBankAccountCreateAvailability,
  ): Promise<AirtableLPBankAccountAvailability>
  getLPBankAccountAvailabilities(): Promise<AirtableLPBankAccountAvailability[]>
  getCashbackForDate(date: Date): Promise<AirtableCashbackBuy | null>
}

export const AirtableServiceSymbol = Symbol.for('IAirtableService')

@injectable()
export class AirtableService implements IAirtableService {
  private static EXCHANGE_RATE_TABLE = 'exchange_rate'
  private static LP_BANK_ACCOUNT_AVAILABILITY_TABLE = 'lp_bank_account_availability'
  private static YIELD_APR_TABLE = 'yield_apr'
  private static CASHBACK_BUY_TABLE = 'cashback_buy'

  private logger: ILogger

  constructor(
    @inject(AirtableConfigSymbol) private config: IAirtableConfig,
    @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory,
  ) {
    this.logger = loggerFactory(AirtableService)

    Airtable.configure({
      apiKey: config.apiKey,
    })
  }

  async getExchangeRateAfter(date: Date): Promise<AirtableExchangeRate[]> {
    const isoDate = formatISO(date)

    const base = Airtable.base(this.config.base)
    const result = await base<any>(AirtableService.EXCHANGE_RATE_TABLE)
      .select({
        filterByFormula: `IS_AFTER({created_datetime}, "${isoDate}")`,
      })
      .all()

    return result.map(x => ({ id: x.id, ...x.fields }))
  }

  async getYieldAprForDate(date: Date): Promise<AirtableYieldApr | null> {
    const isoDate = format(date, 'yyyy-MM-dd', { timeZone: 'UTC' })

    const base = Airtable.base(this.config.baseYield)
    const result = await base<any>(AirtableService.YIELD_APR_TABLE)
      .select({
        filterByFormula: `OR(IS_BEFORE({effective_date}, "${isoDate}"), IS_SAME({effective_date}, "${isoDate}"))`,
        sort: [
          { field: 'effective_date', direction: 'desc' },
          { field: 'created_datetime', direction: 'desc' },
        ],
      })
      .firstPage()

    if (!result?.length) {
      return null
    }

    const yieldApr = result[0]

    return { id: yieldApr.id, ...yieldApr.fields }
  }

  async getYieldApr(): Promise<AirtableYieldApr[]> {
    const base = Airtable.base(this.config.baseYield)
    const result = await base<any>(AirtableService.YIELD_APR_TABLE).select().all()

    return result.map(x => ({ id: x.id, ...x.fields }))
  }

  async addLPBankAccountAvailability(
    model: AirtableLPBankAccountCreateAvailability,
  ): Promise<AirtableLPBankAccountAvailability> {
    const base = Airtable.base(this.config.base)
    const result = await base<any>(AirtableService.LP_BANK_ACCOUNT_AVAILABILITY_TABLE).create(model)

    return { id: result.id, ...result.fields }
  }

  async getLPBankAccountAvailabilities(): Promise<AirtableLPBankAccountAvailability[]> {
    const base = Airtable.base(this.config.base)
    const result = await base<any>(AirtableService.LP_BANK_ACCOUNT_AVAILABILITY_TABLE).select().all()

    return result.map(x => ({ id: x.id, ...x.fields }))
  }

  async getCashbackForDate(date: Date): Promise<AirtableCashbackBuy | null> {
    const isoDate = formatISO(date)

    const base = Airtable.base(this.config.baseCashbackBuy)
    const result = await base<any>(AirtableService.CASHBACK_BUY_TABLE)
      .select({
        filterByFormula: `OR(IS_BEFORE({start_datetime}, "${isoDate}"), IS_SAME({start_datetime}, "${isoDate}"))`,
        sort: [{ field: 'created_datetime', direction: 'desc' }],
      })
      .firstPage()

    if (!result?.length) {
      return null
    }

    let configs: AirtableCashbackBuy[] = result.map(x => ({ id: x.id, ...x.fields }))

    let eligibleConfigs = configs
      .filter(
        x => x.enabled && new Date(x.start_datetime) <= date && (!x.end_datetime || new Date(x.end_datetime) >= date),
      )
      .sort((a, b) => new Date(b.created_datetime).getTime() - new Date(a.created_datetime).getTime())

    if (!eligibleConfigs.length) {
      return null
    }

    return eligibleConfigs[0]
  }
}
