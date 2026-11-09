2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IAirtableConfig {
  readonly apiKey: string
  readonly cacheExpiresIn: number
  readonly base: string
  readonly baseYield: string
  readonly baseCashbackBuy: string
}

export const AirtableConfigSymbol = Symbol.for('IAirtableConfig')

@injectable()
export class AirtableConfig implements IAirtableConfig {
  readonly apiKey: string
  readonly cacheExpiresIn: number
  readonly base: string
  readonly baseYield: string
  readonly baseCashbackBuy: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('airtable')) {
      throw new ConfigError('airtable configuration is missing')
    }

    this.apiKey = config.get('airtable.apiKey')
    this.cacheExpiresIn = config.get('airtable.cacheExpiresIn')
    this.base = config.get('airtable.base')
    this.baseYield = config.get('airtable.baseYield')
    this.baseCashbackBuy = config.get('airtable.baseCashbackBuy')
  }
}
