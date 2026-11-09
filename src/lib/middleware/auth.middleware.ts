import { inject } from 'inversify'
import fbAdmin from 'firebase-admin'

import { IMiddleware, IHttpRequest, middleware, RequestError, StatusCode } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ConfigSymbol, IConfig } from '@ts-awesome/config'

import { ClaimsSymbol, IClaims } from '../../models/auth'
import { AuthTokenServiceSymbol, ITokenService } from '../services/token'
import { IUserEntityService, UserEntityServiceSymbol } from '../../models/db'
import { UnauthorizedError } from '../../errors'

const SupportedSchemes = ['JWT', 'Bearer', 'Fire-Token']

export const CurrentTokenSymbol = Symbol.for('CurrentToken')

@middleware(5)
export class AuthMiddleware implements IMiddleware {
  @inject(LoggerFactorySymbol)
  private loggerFactory!: ILoggerFactory

  @inject(AuthTokenServiceSymbol) authTokenService!: ITokenService<IClaims>
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  @inject(ConfigSymbol) private config!: IConfig

  public async handle(req: IHttpRequest): Promise<void> {
    const logger = this.loggerFactory(AuthMiddleware)

    const {
      container,
      headers: { authorization },
    } = req

    let token: string | null = null
    if (authorization) {
      const [schema, ...parts] = authorization.split(' ')

      if (!SupportedSchemes.includes(schema)) {
        throw new UnauthorizedError(`Unsupported authorization scheme ${JSON.stringify(schema)}`)
      }

      token = parts.join(' ')
      if (token && token !== 'null') {
        let claims: IClaims | null = null

        switch (schema.toLowerCase()) {
          case 'jwt':
          case 'bearer':
            try {
              claims = this.authTokenService.verify(token)
            } catch (err: any) {
              logger.error(err)
              throw new UnauthorizedError(`User is unauthorized`)
            }
            break
          case 'fire-token': {
            try {
              const fbClaims = await fbAdmin.auth().verifyIdToken(token)
              claims = {
                exp: fbClaims.exp,
                iat: fbClaims.iat,
                aud: fbClaims.aud,
                iss: fbClaims.iss,
                fireUserUid: fbClaims.sub,
              }
            } catch (err: any) {
              logger.error(err)
              throw new UnauthorizedError(`User is unauthorized`)
            }
            break
          }
          default:
            throw new RequestError(
              "Authorization scheme hasn't implemented yet",
              'NotImplemented',
              StatusCode.NotImplemented,
            )
        }

        container?.rebind<string | null>(CurrentTokenSymbol).toConstantValue(token)
        container?.bind<IClaims | null>(ClaimsSymbol).toConstantValue(claims)

        logger.debug(`authorized via ${authorization ? 'header' : 'query token'}`)
        return
      }
    }

    container?.bind<IClaims | null>(ClaimsSymbol).toConstantValue(null)
  }
}
