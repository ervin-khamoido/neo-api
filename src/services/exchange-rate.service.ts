2021

import { inject, injectable } from 'inversify'
import { differenceInMinutes } from 'date-fns'
import { desc } from '@ts-awesome/orm'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  ExchangeRateEntityServiceSymbol,
  ExchangeRateModel,
  IExchangeRateEntityService,
} from '../models/db/exchange-rate.model'

import { ExchangeRateOutput } from '../models/response'

import { AirtableServiceSymbol, IAirtableService } from './airtable.service'
import { IKeyValueStorageService, KeyValueStorageServiceSymbol } from '../lib/services/key-value-storage'

const EXCHANGE_RATE_SYNC_TIMEOUT = 3 // minutes
const LATEST_EXCHANGE_RATE_CACHE_KEY = 'LATEST_EXCHANGE_RATE'
const LATEST_EXCHANGE_RATE_CACHE_TIMEOUT = 1000 * 60 * 60 // 1h

export interface IExchangeRateService {
  getExchangeRate(date: Date): Promise<ExchangeRateOutput>
  getLatestExchangeRate(): Promise<ExchangeRateOutput>
  verifyBuyExchangeRate(buyExchangeRate: number): Promise<boolean>
  verifySellExchangeRate(sellExchangeRate: number): Promise<boolean>
}

export const ExchangeRateServiceSymbol = Symbol.for('IExchangeService')

@injectable()
export class ExchangeRateService implements IExchangeRateService {
  private static readonly EPOCH = new Date(1970, 1, 1, 0, 0, 0, 0)
  private static lastSyncDate = ExchangeRateService.EPOCH

  @inject(AirtableServiceSymbol) airtable!: IAirtableService
  @inject(ExchangeRateEntityServiceSymbol) exchangeRateEntityService!: IExchangeRateEntityService
  @inject(KeyValueStorageServiceSymbol) keyValueStorage!: IKeyValueStorageService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(ExchangeRateService)
  }

  async getExchangeRate(date: Date): Promise<ExchangeRateOutput> {
    await this.syncExchangeRateTable()

    const exchangeRateValue = await this.keyValueStorage.get(LATEST_EXCHANGE_RATE_CACHE_KEY)
    let exchangeRate
    try {
      exchangeRate = JSON.parse(exchangeRateValue || 'null')
    } catch (err) {}

    if (!exchangeRate) {
      exchangeRate = await this.exchangeRateEntityService
        .select()
        .where(x => x.appliesAt.lte(date))
        .orderBy(x => [desc(x.appliesAt)])
        .limit(1)
        .fetchOne(ExchangeRateModel)

      if (!exchangeRate) {
        throw new Error('No exchange rates found')
      }

      // Add to cache
      try {
        await this.keyValueStorage.set(
          LATEST_EXCHANGE_RATE_CACHE_KEY,
          JSON.stringify(exchangeRate),
          LATEST_EXCHANGE_RATE_CACHE_TIMEOUT,
        )
      } catch (err) {
        this.logger.error(err as any)
      }
    }

    return {
      buyExchangeRate: exchangeRate.buyExchangeRate,
      sellExchangeRate: exchangeRate.sellExchangeRate,
    }
  }

  async getLatestExchangeRate(): Promise<ExchangeRateOutput> {
    return await this.getExchangeRate(new Date())
  }

  private async syncExchangeRateTable() {
    const now = new Date()
    if (differenceInMinutes(now, ExchangeRateService.lastSyncDate) < EXCHANGE_RATE_SYNC_TIMEOUT) {
      return
    }

    const lastExchangeRate = await this.exchangeRateEntityService
      .select()
      .orderBy(x => [desc(x.createdAt)])
      .limit(1)
      .fetchOne(ExchangeRateModel)

    const createdAt = lastExchangeRate?.createdAt ?? ExchangeRateService.EPOCH

    try {
      const result = await this.airtable.getExchangeRateAfter(createdAt)
      const exchangeRates = result.map(x => ({
        externalUid: x.id,
        source: 'airtable',
        buyExchangeRate: x.buy_exchange_rate,
        sellExchangeRate: x.sell_exchange_rate,
        appliesAt: x.start_datetime,
        createdAt: x.created_datetime,
        updatedAt: x.modified_datetime,
      }))

      await this.exchangeRateEntityService.add(exchangeRates)

      ExchangeRateService.lastSyncDate = now

      // Invalidate cache
      await this.keyValueStorage.delete(LATEST_EXCHANGE_RATE_CACHE_KEY)
      this.logger.info('Exchange rates sync done.')
    } catch (err) {
      this.logger.error(err as any)
    }
  }

  async verifyBuyExchangeRate(exchangeRate: number): Promise<boolean> {
    const { buyExchangeRate } = await this.getLatestExchangeRate()

    // If the buy exchange rate has changed, return false
    if (buyExchangeRate !== exchangeRate) {
      return false
    }

    return true
  }

  async verifySellExchangeRate(exchangeRate: number): Promise<boolean> {
    const { sellExchangeRate } = await this.getLatestExchangeRate()

    // If the sell exchange rate has changed, return false
    if (sellExchangeRate !== exchangeRate) {
      return false
    }

    return true
  }
}
