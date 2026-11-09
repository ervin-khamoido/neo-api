import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigSymbol } from '@ts-awesome/logger'

import { TokenConfig } from './token.config'

export const ConfirmTokenConfigSymbol = Symbol.for('ConfirmTokenConfig')

@injectable()
export class ConfirmTokenConfig extends TokenConfig {
  constructor(@inject(ConfigSymbol) config: IConfig) {
    super('confirm', config)
  }
}
