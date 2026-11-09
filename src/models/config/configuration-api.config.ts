2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IConfigurationApiConfig {
  readonly allow: boolean
  readonly key: string
}

export const ConfigurationApiConfigSymbol = Symbol.for('IConfigurationApiConfig')

@injectable()
export class ConfigurationApiConfig implements IConfigurationApiConfig {
  readonly allow: boolean
  readonly key: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('configurationApi')) {
      throw new ConfigError('configurationApi configuration is missing')
    }

    this.allow = JSON.parse(config.get<string>('configurationApi.allow'))
    this.key = config.get<string>('configurationApi.key')
  }
}
