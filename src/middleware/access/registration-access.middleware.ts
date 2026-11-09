2021

import { inject, injectable, named } from 'inversify'
import fbAdmin from 'firebase-admin'

import { IHttpRequest, IMiddleware, UnauthorizedError } from '@ts-awesome/rest'
import { ConfigSymbol, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { Symbols as ValidatorSymbols } from '@ts-awesome/validate/dist/symbols'
import { SingleValidator } from '@ts-awesome/validate'

import { ClaimsSymbol, IClaims } from '../../models/auth'
import { IUserEntityService, UserEntityServiceSymbol } from '../../models/db'
import { CurrentFireUserSymbol } from './common'
import { IConfig } from 'config'

@injectable()
export class RegistrationAccessMiddleware implements IMiddleware {
  public static AUDIENCE = 'registration'

  @inject(LoggerFactorySymbol) loggerFactory!: ILoggerFactory

  @inject(ValidatorSymbols.Validator)
  @named('uuid')
  private uuidValidator!: SingleValidator<string>

  @inject(ConfigSymbol) config!: IConfig

  @inject(ClaimsSymbol) claims?: IClaims | null
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  public async handle(req: IHttpRequest): Promise<void> {
    const { fireUserUid, phone, aud, exp, iat, nbf } = this.claims ?? {}

    const domain = this.config.get<string>('domain')
    if (!aud?.includes(domain) || !aud?.includes(RegistrationAccessMiddleware.AUDIENCE)) {
      throw new UnauthorizedError()
    }

    // TODO: check exp, iat+nbf
    if (typeof fireUserUid === 'string') {
      let fireUser
      try {
        fireUser = await fbAdmin.auth().getUser(fireUserUid)
      } catch (err) {
        if (err instanceof Error) {
          throw new UnauthorizedError(err.message)
        }

        throw new UnauthorizedError('Failed to get firebase user')
      }

      // phone changed in firebase, token is not valid for new phone number
      if (fireUser.phoneNumber !== phone) {
        throw new UnauthorizedError()
      }

      req.container?.rebind<fbAdmin.auth.UserRecord>(CurrentFireUserSymbol).toConstantValue(fireUser)
    } else {
      throw new UnauthorizedError()
    }
  }
}
