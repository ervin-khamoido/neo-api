2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IFreshdeskConfig {
  readonly url: string
  readonly key: string
  readonly systemContactEmail: string
  readonly supportGroupId: string
  readonly fields: any
}

export const FreshdeskConfigSymbol = Symbol.for('IFreshdeskConfig')

@injectable()
export class FreshdeskConfig implements IFreshdeskConfig {
  readonly url: string
  readonly key: string
  readonly systemContactEmail: string
  readonly supportGroupId: string
  readonly fields: any

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('freshdesk')) {
      throw new ConfigError('Freshdesk configuration is missing')
    }

    this.url = config.get('freshdesk.url')
    this.key = config.get('freshdesk.key')
    this.systemContactEmail = config.get('freshdesk.systemContactEmail')
    this.supportGroupId = config.get('freshdesk.supportGroupId')
    this.fields = JSON.parse(config.get('freshdesk.fields'))
  }
}
