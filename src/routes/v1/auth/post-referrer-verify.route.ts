2021

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'

import { ReferrerVerifyInput } from '../../../models/request'
import Validation from '../../../lib/utils/validation'
import { IUserDetailsEntityService, UserEntityServiceSymbol } from '../../../models/db'
import { RegistrationAccessMiddleware } from '../../../middleware'
import { IUserReferrerService, UserReferrerServiceSymbol } from '../../../services/referrals/user-referrer.service'
import { ReferrerVerifyOutput } from '../../../models/response'

@httpPost('/api/v1/auth/referrer/verify', RegistrationAccessMiddleware)
export class PostReferrerVerifyRoute extends Route {
  @inject(Validation.symbolFor(ReferrerVerifyInput)) bodyValidator!: IValidator<ReferrerVerifyInput>

  @inject(UserReferrerServiceSymbol) userReferrerService!: IUserReferrerService
  @inject(UserEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService

  @OpenApiOperationPost({
    path: '/api/v1/auth/referrer/verify',
    description: 'Verify if the referral code belongs to any user in the system',
    summary: 'Verify if the referral code belongs to any user in the system',
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        required: true,
        schema: ReferrerVerifyInput,
      },
    },
    responses: {
      [StatusCode.BadRequest]: { description: 'The referral code is invalid. See errors in response' },
      [StatusCode.Success]: { description: 'The verification result', content: ReferrerVerifyOutput },
    },
  })
  public async handle(@requestBody(ReferrerVerifyInput) body: ReferrerVerifyInput): Promise<void> {
    const errors = this.bodyValidator.validate(body)
    if (errors !== true) {
      return this.json(
        { verified: false, referralCode: body?.referralCode, reason: 'The referral code is not valid' },
        ReferrerVerifyOutput,
      )
    }

    const result = await this.userReferrerService.verifyReferrer(body.referralCode)

    return this.json(result, ReferrerVerifyOutput)
  }
}
