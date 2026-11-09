2021

import { inject } from 'inversify'
import fbAdmin from 'firebase-admin'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'

import { EmailInput } from '../../../models/request'

import { ClaimsSymbol, IClaims } from '../../../models/auth'
import { AuthTokenServiceSymbol, ITokenService } from '../../../lib/services/token'

import validation from '../../../lib/utils/validation'

import { CurrentFireUserSymbol, RegistrationAccessMiddleware } from '../../../middleware'
import { IVerificationService, VerificationServiceSymbol } from '../../../services/verification'
import { IUserEntityService, UserEntityServiceSymbol } from '../../../models/db'
import { ConflictError } from '../../../errors'

@httpPost('/api/v1/auth/email', RegistrationAccessMiddleware)
export class PostEmailRoute extends Route {
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(AuthTokenServiceSymbol) tokenService!: ITokenService<IClaims>
  @inject(VerificationServiceSymbol) verificationService!: IVerificationService

  @inject(ClaimsSymbol) claims!: IClaims | null
  @inject(CurrentFireUserSymbol) fireUser!: fbAdmin.auth.UserRecord

  @inject(validation.symbolFor(EmailInput))
  bodyValidator!: IValidator<EmailInput>

  @OpenApiOperationPost({
    path: '/api/v1/auth/email',
    description: 'User submits the email and system sends an one time code',
    summary: 'Submit email for verification',
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        required: true,
        description: "User's email",
        schema: EmailInput,
      },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'An email one time code is sent' },
      [StatusCode.Conflict]: { description: 'User with a such email already exists' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
    },
  })
  async handle(@requestBody(EmailInput) body: EmailInput): Promise<void> {
    this.validate(this.bodyValidator, body, 'Errors:')

    const user = await this.userEntityService.getOne({ email: body.email })
    if (user) {
      throw new ConflictError('User with a such email already exists')
    }

    await this.verificationService.sendByEmail({ email: body.email })

    return this.empty(StatusCode.NoContent)
  }
}
