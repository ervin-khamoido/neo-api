2021

import { inject } from 'inversify'
import { IConfig } from 'config'
import fbAdmin from 'firebase-admin'

import { httpPost, Route, StatusCode, UnauthorizedError } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { ConfigSymbol } from '@ts-awesome/config'

import { IClaims } from '../../../models/auth'
import { AuthTokenServiceSymbol, ITokenService } from '../../../lib/services/token'

import { UserModel } from '../../../models/db'
import { AuthOutput } from '../../../models/response'

import { CurrentFireUserIdSymbol, CurrentUserSymbol, RegistrationAccessMiddleware } from '../../../middleware'
import { AuthTokenConfigSymbol, ITokenConfig } from '../../../lib/models/config'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { addSeconds } from 'date-fns'

@httpPost('/api/v1/auth/signin', FireAccessMiddleware({ skipUserExists: true }))
export class PostSignInRoute extends Route {
  @inject(AuthTokenConfigSymbol) aTokenConfig!: ITokenConfig
  @inject(AuthTokenServiceSymbol) tokenService!: ITokenService<IClaims>

  @inject(ConfigSymbol) config!: IConfig

  @inject(CurrentUserSymbol) user!: UserModel | null
  @inject(CurrentFireUserIdSymbol) fireUserId!: string | null

  @OpenApiOperationPost({
    path: '/api/v1/auth/signin',
    description: 'Sign up in system',
    summary: 'POST user profile',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Token when successfully signed in', content: AuthOutput },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
      [StatusCode.NotImplemented]: { description: 'Sign up for role is not implemented' },
    },
  })
  async handle(): Promise<void> {
    if (this.user) {
      return this.json({ exists: true, verified: true })
    } else {
      const now = new Date()
      const domain = this.config.get<string>('domain')

      if (!this.fireUserId) {
        throw new UnauthorizedError()
      }

      const fireUser = await fbAdmin.auth().getUser(this.fireUserId)
      const token = this.tokenService.sign({
        fireUserUid: fireUser.uid,
        phone: fireUser.phoneNumber,

        aud: [RegistrationAccessMiddleware.AUDIENCE, domain],
        exp: addSeconds(now, 11 * 60), // 11m
        iat: now,
        // nbf: addSeconds(now, 2),
      })

      return this.json({ exists: false, verified: true, token })
    }
  }
}
