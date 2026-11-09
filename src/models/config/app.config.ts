2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'
import { ConfigSymbol } from '@ts-awesome/logger'
import { ConfigError } from '@ts-awesome/config'

export interface IAppConfig {
  readonly buyDummyDelay: number
  readonly sellDummyDelay: number
  readonly buyExpirationTimeout: number
  readonly sellExpirationTimeout: number
  readonly maxPinAttempts: number
  readonly maxRewardAmountUsdc: number
  readonly perTransactionLimits: PerTransactionLimitsConfig
}

export const AppConfigSymbol = Symbol.for('IAppConfig')

@injectable()
export class AppConfig implements IAppConfig {
  readonly buyDummyDelay!: number
  readonly sellDummyDelay!: number
  readonly buyExpirationTimeout!: number
  readonly sellExpirationTimeout!: number
  readonly maxPinAttempts!: number
  readonly maxRewardAmountUsdc!: number
  readonly perTransactionLimits!: PerTransactionLimitsConfig

  constructor(@inject(ConfigSymbol) config: IConfig) {
    this.buyDummyDelay = config.get<number>('appConfig.buyDummyDelay')
    this.sellDummyDelay = config.get<number>('appConfig.sellDummyDelay')
    this.buyExpirationTimeout = config.get<number>('appConfig.buyExpirationTimeout')
    this.sellExpirationTimeout = config.get<number>('appConfig.sellExpirationTimeout')
    this.maxPinAttempts = config.get<number>('appConfig.maxPinAttempts') ?? 5
    this.maxRewardAmountUsdc = config.get<number>('appConfig.maxRewardAmountUsdc')
    this.perTransactionLimits = JSON.parse(config.get<string>('appConfig.perTransactionLimits'))

    const keys: (keyof this)[] = [
      'buyDummyDelay',
      'sellDummyDelay',
      'buyExpirationTimeout',
      'sellExpirationTimeout',
      'maxRewardAmountUsdc',
      'perTransactionLimits',
    ]

    const values = keys.map(x => this[x])
    if (values.some(x => !x)) {
      const missingKeys = keys.filter(x => !this[x]).join(',')

      throw new ConfigError(`Values for keys [${missingKeys}] are required`)
    }
  }
}

export interface IPerTransactionLimitsConfig {
  minBuyAmountUsdc: number
  maxBuyAmountUsdc: number
  minSellAmountUsdc: number
  maxSellAmountUsdc: number
}

export type PerTransactionLimitsConfig = IPerTransactionLimitsConfig
