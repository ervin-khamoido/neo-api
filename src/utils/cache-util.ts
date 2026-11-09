2021

/* eslint-disable prefer-rest-params */

import { ILogger, ILoggerFactory } from '@ts-awesome/logger'
import { IKeyValueStorageService } from '../lib/services/key-value-storage'
import { ICacheConfig, ICacheConfigValues } from '../models/config'
import { isFunction } from 'lodash'

// The values in the enum should match the keys in doppler
export enum CacheConfigKey {
  Banks = 'BANKS',
  LpBankAccounts = 'LP_BANK_ACCOUNTS',
  LpBankAccountGroupsAvailability = 'LP_BANK_ACCOUNT_GROUPS_AVAILABILITY',
  Fees = 'FEES',
  OrderConfiguration = 'ORDER_CONFIGURATION',
  MailTemplates = 'MAIL_TEMPLATES',
  UserLevelLimit = 'USER_LEVEL_LIMIT',
  HelpCenter = 'HELP_CENTER',
  FreshdeskEmailConfig = 'FRESHDESK_EMAIL_CONFIGS',
  CashbackBuyConfig = 'CASHBACK_BUY_CONFIGS',
  OnChainExchangeRateConfig = 'ON_CHAIN_EXCHANGE_RATE_CONFIGS'
}

interface ICacheParams {
  configKey: CacheConfigKey
  version: number
  get cacheKey(): string
}

class CacheParams implements ICacheParams {
  readonly configKey!: CacheConfigKey
  readonly version!: number

  get cacheKey(): string {
    const versionPostfix = this.version ? '_' + this.version : ''
    const versionedCacheKey = this.configKey + versionPostfix

    return versionedCacheKey
  }

  constructor(configKey: CacheConfigKey, version?: number) {
    this.configKey = configKey
    this.version = version || 0
  }
}

export class CacheKey {
  static readonly Banks: CacheParams = new CacheParams(CacheConfigKey.Banks)
  static readonly LpBankAccounts: CacheParams = new CacheParams(CacheConfigKey.LpBankAccounts)
  static readonly LpBankAccountGroupsAvailability: CacheParams = new CacheParams(CacheConfigKey.LpBankAccountGroupsAvailability)
  static readonly Fees: CacheParams = new CacheParams(CacheConfigKey.Fees, 3)
  static readonly OrderConfiguration: CacheParams = new CacheParams(CacheConfigKey.OrderConfiguration)
  static readonly MailTemplates: CacheParams = new CacheParams(CacheConfigKey.MailTemplates, 17)
  static readonly UserLevelLimit: CacheParams = new CacheParams(CacheConfigKey.UserLevelLimit)
  static readonly HelpCenter: CacheParams = new CacheParams(CacheConfigKey.HelpCenter)
  static readonly FreshdeskEmailConfig: CacheParams = new CacheParams(CacheConfigKey.FreshdeskEmailConfig)
  static readonly CashbackConfig: CacheParams = new CacheParams(CacheConfigKey.CashbackBuyConfig)
  static readonly OnChainExchangeRate: CacheParams = new CacheParams(CacheConfigKey.OnChainExchangeRateConfig)
}

let keyValueStorage: IKeyValueStorageService
let cacheConfig: ICacheConfig
let logger: ILogger

function initialize(config: ICacheConfig, storage: IKeyValueStorageService, loggerFactory: ILoggerFactory): void {
  keyValueStorage = storage
  cacheConfig = config
  logger = loggerFactory('CacheUtil')
}

export function cache(params: ICacheParams) {
  return function cacheDecorator(target: any, propertyName: string, descriptor: PropertyDescriptor): void {
    const decoratedMethod = descriptor.value

    if (!isFunction(decoratedMethod)) {
      throw new Error('cache target is not a function')
    }

    descriptor.value = async function (): Promise<any> {
      if (!cacheConfig || !keyValueStorage || !cacheConfig.configs) {
        throw new Error('cache not initialized')
      }

      const config = <ICacheConfigValues>cacheConfig.configs[params.configKey]
      if (!config) {
        logger.error(`cache configs not found for key: ${params.configKey}, skipping cache process`)
        return await decoratedMethod.apply(this, [...arguments])
      }

      if (config.enabled) {
        let cachedData = null
        try {
          cachedData = await keyValueStorage.get(params.cacheKey)

          if (cachedData) {
            return JSON.parse(cachedData ?? 'null')
          }
        } catch (err) {
          logger.error(err as Error)
        }
      }

      const data = await decoratedMethod.apply(this, [...arguments])
      if (data && config.enabled) {
        await keyValueStorage.set(params.cacheKey, JSON.stringify(data), config.timeout)
      }

      return data
    }
  }
}

export function invalidateCache(params: ICacheParams) {
  return function invalidateCacheDecorator(target: any, propertyName: string, descriptor: PropertyDescriptor): void {
    const decoratedMethod = descriptor.value

    if (!isFunction(decoratedMethod)) {
      throw new Error('cache invalidation target is not a function')
    }

    descriptor.value = async function (): Promise<any> {
      if (!cacheConfig || !keyValueStorage || !cacheConfig.configs) {
        throw new Error('cache not initialized')
      }

      const config = <ICacheConfigValues>cacheConfig.configs[params.configKey]
      if (!config) {
        throw new Error(`cache configs not found for key: ${params.configKey}`)
      }

      // If the cache is enabled, delete it
      if (config.enabled) {
        await keyValueStorage.delete(params.cacheKey)
      }

      return await decoratedMethod.apply(this, [...arguments])
    }
  }
}

export default {
  initialize,
}
