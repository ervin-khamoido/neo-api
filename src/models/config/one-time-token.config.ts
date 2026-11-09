2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigSymbol } from '@ts-awesome/logger'

import { TokenConfig } from '../../lib/models/config/token.config'

export const OneTimeTokenConfigSymbol = Symbol.for('OneTimeTokenConfig')

@injectable()
export class OneTimeTokenConfig extends TokenConfig {
  constructor(@inject(ConfigSymbol) config: IConfig) {
    super('oneTime', config)
  }
}
