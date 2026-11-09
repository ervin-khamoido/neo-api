2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface ISumsubConfig {
  readonly apiUrl: string
  readonly apiToken: string
  readonly apiSecret: string
  readonly webhookSecretKey: string
}

export const SumsubConfigSymbol = Symbol.for('ISumsubConfig')

@injectable()
export class SumsubConfig implements ISumsubConfig {
  readonly apiUrl: string
  readonly apiToken: string
  readonly apiSecret: string
  readonly webhookSecretKey: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('sumsub')) {
      throw new ConfigError('sumsub configuration is missing')
    }

    this.apiUrl = config.get('sumsub.apiUrl')
    this.apiToken = config.get('sumsub.apiToken')
    this.apiSecret = config.get('sumsub.apiSecret')
    this.webhookSecretKey = config.get('sumsub.webhookSecretKey')
  }
}
