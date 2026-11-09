import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IBranchIOConfig {
  readonly url: string
  readonly key: string
  readonly secret: string
}

export const BranchIOConfigSymbol = Symbol.for('IBranchIOConfig')

@injectable()
export class BranchIOConfig implements IBranchIOConfig {
  readonly url: string
  readonly key: string
  readonly secret: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('branchio')) {
      throw new ConfigError('branchio configuration is missing')
    }

    this.url = config.get('branchio.url')
    this.key = config.get('branchio.key')
    this.secret = config.get('branchio.secret')
  }
}
