import { inject } from 'inversify'
import fbAdmin, { FirebaseError } from 'firebase-admin'
import { UserRecord } from 'firebase-admin/lib/auth/user-record'
import { IConfig } from 'config'

import { ForbiddenError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { ConfigSymbol } from '@ts-awesome/config'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { PhoneVerifyInput } from '../../../../models/request/phone-verify.input'
import { AuthOutput } from '../../../../models/response'
import validation from '../../../../lib/utils/validation'
import { IVerificationService, VerificationServiceSymbol } from '../../../../services/verification'
import { ITestPhoneNumberEntityService, TestPhoneNumberEntityServiceSymbol } from '../../../../models/db'
import { BadRequestError } from '../../../../errors'

@httpPost('/api/v1/auth/phone/verify')
export class PostPhoneCodeVerifyRoute extends Route {
  @inject(ConfigSymbol) config!: IConfig

  @inject(VerificationServiceSymbol) verificationService!: IVerificationService
  @inject(TestPhoneNumberEntityServiceSymbol) testPhoneNumberService!: ITestPhoneNumberEntityService

  @inject(validation.symbolFor(PhoneVerifyInput))
  bodyValidator!: IValidator<PhoneVerifyInput>

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PostPhoneCodeVerifyRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/auth/phone/verify',
    description: "Verify user's email",
    summary: "POST user's email code",
    security: [{}],
    request: {
      body: {
        required: true,
        description: 'User profile',
        schema: PhoneVerifyInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'New token when successfully email verified', content: AuthOutput },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
    },
  })
  async handle(@requestBody(PhoneVerifyInput) body: PhoneVerifyInput): Promise<void> {
    this.validate(this.bodyValidator, body, 'Errors:')

    const testPhoneNumber = await this.testPhoneNumberService.getOne({ phone: body.phone })
    if (testPhoneNumber) {
      if (testPhoneNumber.code !== body.code) {
        throw new BadRequestError('Invalid code')
      }
    } else {
      await this.verificationService.verifyBySMS(body.phone, body.code)
    }

    let user: UserRecord | null = null
    try {
      user = await fbAdmin.auth().getUserByPhoneNumber(body.phone)
    } catch (err) {
      if ((err as FirebaseError).code === 'auth/user-not-found') {
        // expected
      } else {
        this.logger.error(err as any)
        throw new ForbiddenError()
      }
    }

    if (!user) {
      user = await fbAdmin.auth().createUser({
        phoneNumber: body.phone,
      })
    }

    const firebaseCustomToken = await fbAdmin.auth().createCustomToken(user.uid)
    return this.json({ firebaseCustomToken })
  }
}
