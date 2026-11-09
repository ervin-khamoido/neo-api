2021

import { inject, injectable } from 'inversify'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol, ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { IConfig } from 'config'

import { CacheConfigKey, CacheKey } from '../../utils/cache-util'

export interface ICacheConfig {
  readonly configs: Record<CacheConfigKey, ICacheConfigValues> | null
}

export interface ICacheConfigValues {
  enabled: boolean
  timeout: number
}

export const CacheConfigSymbol = Symbol.for('ICacheConfig')

@injectable()
export class CacheConfig implements ICacheConfig {
  readonly configs: Record<CacheConfigKey, ICacheConfigValues> | null
  private readonly logger: ILogger

  constructor(@inject(ConfigSymbol) config: IConfig, @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(CacheConfig)

    if (!config.has('cache')) {
      throw new ConfigError('cache configurations are missing')
    }

    // By default will be null
    this.configs = null

    const cacheConfigs = config.get<string>('cache.configs')
    if (cacheConfigs) {
      try {
        this.configs = JSON.parse(cacheConfigs)
      } catch (error: any) {
        this.logger.error('Unable to parse cache configs: ' + error)
      }
    }
  }
}
