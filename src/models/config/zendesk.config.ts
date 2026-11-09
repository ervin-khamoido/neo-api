import { inject, injectable } from 'inversify'
import { IConfig } from 'config'
import { ConfigSymbol } from '@ts-awesome/logger'
import { ConfigError } from '@ts-awesome/config'

export interface IZendeskConfig {
  readonly baseUrl: string
  readonly apiKey: string
  readonly email: string
  readonly credentials: string
}

export const ZendeskConfigSymbol = Symbol.for('IZendeskConfig')

@injectable()
export class ZendeskConfig implements IZendeskConfig {
  readonly baseUrl!: string
  readonly apiKey!: string
  readonly email!: string

  get credentials(): string {
    return `${this.email}/token:${this.apiKey}`
  }

  constructor(@inject(ConfigSymbol) config: IConfig) {
    this.baseUrl = config.get<string>('zendesk.baseUrl')
    this.apiKey = config.get<string>('zendesk.apiKey')
    this.email = config.get<string>('zendesk.email')

    if (!this.baseUrl || !this.apiKey || !this.email) {
      throw new ConfigError('zendesk.baseUrl, zendesk.apiKey and zendesk.email are required')
    }
  }
}
