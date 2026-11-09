2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface ISendwyreConfig {
  readonly url: string
  readonly key: string
  readonly secret: string
}

export const SendwyreConfigSymbol = Symbol.for('ISendwyreConfig')

@injectable()
export class SendwyreConfig implements ISendwyreConfig {
  readonly url: string
  readonly key: string
  readonly secret: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('sendwyre')) {
      throw new ConfigError('sendwyre configuration is missing')
    }

    this.url = config.get('sendwyre.url')
    this.key = config.get('sendwyre.key')
    this.secret = config.get('sendwyre.secret')
  }
}
