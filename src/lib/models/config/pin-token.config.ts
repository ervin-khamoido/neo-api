import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigSymbol } from '@ts-awesome/logger'

import { TokenConfig } from './token.config'

export const PinTokenConfigSymbol = Symbol.for('PinTokenConfig')

@injectable()
export class PinTokenConfig extends TokenConfig {
  constructor(@inject(ConfigSymbol) config: IConfig) {
    super('pin', config)
  }
}
