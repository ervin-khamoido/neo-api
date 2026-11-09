2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface ISupportConfig {
  readonly email: string
}

export const SupportConfigSymbol = Symbol.for('ISupportConfig')

@injectable()
export class SupportConfig implements ISupportConfig {
  readonly email: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('support')) {
      throw new ConfigError('support configuration is missing')
    }

    this.email = config.get('support.email')
  }
}
