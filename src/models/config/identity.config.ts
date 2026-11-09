2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IIdentityConfig {
  readonly documentUrlSecret: string
}

export const IdentityConfigSymbol = Symbol.for('IIdentityConfig')

@injectable()
export class IdentityConfig implements IIdentityConfig {
  readonly documentUrlSecret: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('identity')) {
      throw new ConfigError('Identity configuration is missing')
    }

    this.documentUrlSecret = config.get('identity.documentUrlSecret')
  }
}
