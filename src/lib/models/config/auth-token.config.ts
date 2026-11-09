import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigSymbol } from '@ts-awesome/logger'
import { TokenConfig } from './token.config'

export const AuthTokenConfigSymbol = Symbol.for('AuthTokenConfig')

@injectable()
export class AuthTokenConfig extends TokenConfig {
  constructor(@inject(ConfigSymbol) config: IConfig) {
    super('auth', config)
  }
}
