// 2021

import { inject } from 'inversify'

import { httpPatch, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPatch } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'

import validation from '../../../../lib/utils/validation'

import { UserModel } from '../../../../models/db'
import { UpdateReferralCodeInput } from '../../../../models/request'

import { CurrentUserSymbol, DashboardAccessMiddleware } from '../../../../middleware'

import { IUserReferrerService, UserReferrerServiceSymbol } from '../../../../services/referrals/user-referrer.service'
import { UpdateReferralCodeOutput } from '../../../../models/response'

@httpPatch('/api/v1/user/referrer/code', DashboardAccessMiddleware)
export class PatchUserReferrerCodeRoute extends Route {
  @inject(validation.symbolFor(UpdateReferralCodeInput))
  validator!: IValidator<UpdateReferralCodeInput>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserReferrerServiceSymbol) userReferrerService!: IUserReferrerService

  @OpenApiOperationPatch({
    path: '/api/v1/user/referrer/code',
    description: 'Patch change user referral code',
    summary: 'PATCH change user referral code',
    security: [{ DashboardToken: [] }],
    request: {
      body: {
        required: true,
        schema: UpdateReferralCodeInput,
      },
    },
    responses: {
      [StatusCode.Success]: {
        description: 'User referral code update results',
        content: UpdateReferralCodeOutput,
      },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(UpdateReferralCodeInput) body: UpdateReferralCodeInput): Promise<void> {
    this.validate(this.validator, body, 'Errors: ')

    const response = await this.userReferrerService.changeReferralCode(body.email, body.referralCode)

    return this.json(response, UpdateReferralCodeOutput)
  }
}
