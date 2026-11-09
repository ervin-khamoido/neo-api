2021

import { inject } from 'inversify'
import fbAdmin from 'firebase-admin'
import { IConfig } from 'config'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { ConfigSymbol } from '@ts-awesome/config'

import {
  EmailVerificationEntityServiceSymbol,
  IEmailVerificationEntityService,
  IUserEntityService,
  UserEntityServiceSymbol,
} from '../../../models/db'
import { AuthOutput } from '../../../models/response'
import { EmailVerifyInput } from '../../../models/request'

import { IClaims } from '../../../models/auth'
import { AuthTokenServiceSymbol, ITokenService } from '../../../lib/services/token'

import validation from '../../../lib/utils/validation'

import { CurrentFireUserSymbol, RegistrationAccessMiddleware } from '../../../middleware'
import { IVerificationService, VerificationServiceSymbol } from '../../../services/verification'
import { addSeconds } from 'date-fns'
import { ConflictError } from '../../../errors'

@httpPost('/api/v1/auth/email/verify', RegistrationAccessMiddleware)
export class PostEmailVerifyRoute extends Route {
  @inject(ConfigSymbol) config!: IConfig

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(EmailVerificationEntityServiceSymbol) emailVerificationService!: IEmailVerificationEntityService

  @inject(AuthTokenServiceSymbol) tokenService!: ITokenService<IClaims>
  @inject(VerificationServiceSymbol) verificationService!: IVerificationService

  @inject(CurrentFireUserSymbol) fireUser!: fbAdmin.auth.UserRecord

  @inject(validation.symbolFor(EmailVerifyInput))
  bodyValidator!: IValidator<EmailVerifyInput>

  @inject(UnitOfWorkSymbol)
  uow!: IUnitOfWork<void>

  @OpenApiOperationPost({
    path: '/api/v1/auth/email/verify',
    description: "Verify user's email",
    summary: "POST user's email code",
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        required: true,
        description: 'User profile',
        schema: EmailVerifyInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'New token when successfully email verified', content: AuthOutput },
      [StatusCode.Conflict]: { description: 'User with a such email or phone already exists' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
    },
  })
  async handle(@requestBody(EmailVerifyInput) body: EmailVerifyInput): Promise<void> {
    this.validate(this.bodyValidator, body, 'Errors:')

    const user = await this.userEntityService.getOne({ email: body.email })
    if (user) {
      throw new ConflictError('User with a such email already exists')
    }

    await this.verificationService.verifyByEmail(body.email, body.code)

    const domain = this.config.get<string>('domain')
    const emailVerification = await this.emailVerificationService.addOne({ email: body.email })

    const now = new Date()
    const token = this.tokenService.sign({
      fireUserUid: this.fireUser.uid,
      phone: this.fireUser.phoneNumber,
      emailVerificationId: emailVerification.uid,
      aud: [RegistrationAccessMiddleware.AUDIENCE, domain],
      exp: addSeconds(now, 30 * 60), // 30m
      iat: now,
      // nbf: addSeconds(now, 2),
    })

    return this.json({ token, exists: false, verified: true }, StatusCode.Success, AuthOutput)
  }
}
