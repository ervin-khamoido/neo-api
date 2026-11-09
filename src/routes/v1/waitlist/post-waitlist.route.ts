// 2021

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { UserModel } from '../../../models/db'

import { UserWaitlistInput } from '../../../models/request'
import { CurrentUserSymbol } from '../../../middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import {
  IWaitlistBusinessService,
  WaitlistBusinessServiceSymbol,
} from '../../../services/business/waitlist/waitlist.business.service'
import validation from '../../../lib/utils/validation'
import { IValidator } from '@ts-awesome/validate'

@httpPost('/api/v1/waitlist', FireAccessMiddleware())
export class PostWaitlistRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel
  @inject(WaitlistBusinessServiceSymbol) waitlistBusinessService!: IWaitlistBusinessService

  @inject(validation.symbolFor(UserWaitlistInput)) validator!: IValidator<UserWaitlistInput>

  @OpenApiOperationPost({
    path: '/api/v1/waitlist',
    description: 'Subscribe the user to the feature waitlist',
    summary: 'POST waitlist feature subscription',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        schema: UserWaitlistInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'Successfully added the user to waitlist' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(UserWaitlistInput) body: UserWaitlistInput): Promise<void> {
    this.validate(this.validator, body, '')

    await this.waitlistBusinessService.addUserToWaitlist(this.user.id, body.feature)

    return this.empty(StatusCode.Success)
  }
}
