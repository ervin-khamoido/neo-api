import { inject, injectable } from 'inversify'

import { IClaims } from '../../../models/auth'
import { ITokenService, TokenService } from './token.service'
import { AuthTokenConfigSymbol, ITokenConfig } from '../../models/config'

export const AuthTokenServiceSymbol = Symbol.for('ITokenService<IClaims>')

@injectable()
export class AuthTokenService extends TokenService<IClaims> implements ITokenService<IClaims> {
  constructor(@inject(AuthTokenConfigSymbol) configs: ITokenConfig) {
    super(configs)
  }

  public sign(claims: IClaims): string {
    if (claims.exp instanceof Date) {
      claims.exp = Math.ceil(claims.exp.getTime() / 1000)
    }

    if (claims.nbf instanceof Date) {
      claims.nbf = Math.ceil(claims.nbf.getTime() / 1000)
    }

    if (claims.iat instanceof Date) {
      claims.iat = Math.ceil(claims.iat.getTime() / 1000)
    }

    return super.sign(claims)
  }
}
