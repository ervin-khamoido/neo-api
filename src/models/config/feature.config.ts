2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol, ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { LoggerLevel } from '../../logging/extended-logger'

export interface IFeatureConfig {
  readonly swagger: boolean
  readonly lpBankAccountAvailability: boolean
  readonly loggerContext: Record<LoggerLevel, boolean> | null

  /**
   * @deprecated The property should be removed the next release after breaking change release.
   */
  readonly signUpV1: boolean
}

export const FeatureConfigSymbol = Symbol.for('IFeatureConfig')

@injectable()
export class FeatureConfig implements IFeatureConfig {
  readonly swagger: boolean
  readonly lpBankAccountAvailability: boolean
  readonly loggerContext: Record<LoggerLevel, boolean> | null
  readonly signUpV1: boolean

  private logger: ILogger

  constructor(@inject(ConfigSymbol) config: IConfig, @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(FeatureConfig)

    if (!config.has('feature')) {
      throw new ConfigError('feature configuration is missing')
    }

    this.swagger = config.get<string>('feature.swagger') === 'true'
    this.lpBankAccountAvailability = config.get<string>('feature.lpBankAccountAvailability') === 'true'
    this.signUpV1 = config.get<string>('feature.signUpV1') === 'true'

    this.loggerContext = null
    const loggerContextConfig = config.get<string>('feature.loggerContext')
    if (loggerContextConfig) {
      try {
        this.loggerContext = JSON.parse(loggerContextConfig)
      } catch (error: any) {
        // Unable to parse the logger context config, will default everything to false in the extended logger
        this.logger.error('Could not parse the logger context feature configs')
      }
    }
  }
}
