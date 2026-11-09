import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigSymbol } from '@ts-awesome/logger'
import { ConfigError } from '@ts-awesome/rest'

export interface IMailgunConfig {
  readonly apiKey: string
  readonly sendingDomain: string
  readonly sendingUrl: string
  readonly from: string
}

export const MailgunConfigSymbol = Symbol.for('IMailgunConfig')

@injectable()
export class MailgunConfig implements IMailgunConfig {
  readonly apiKey: string
  readonly sendingDomain: string
  readonly sendingUrl: string
  readonly from: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    this.apiKey = config.get<string>('mailgun.apiKey')
    if (!this.apiKey) {
      throw new ConfigError('mailgun.apiKey is missing')
    }

    this.sendingDomain = config.get<string>('mailgun.sendingDomain')
    if (!this.sendingDomain) {
      throw new ConfigError('mailgun.sendingDomain is missing')
    }

    this.sendingUrl = config.get<string>('mailgun.sendingUrl')
    if (!this.sendingUrl) {
      throw new ConfigError('mailgun.sendingUrl is missing')
    }

    this.from = config.get<string>('mailgun.from')
    if (!this.from) {
      throw new ConfigError('mailgun.from is missing')
    }
  }
}
