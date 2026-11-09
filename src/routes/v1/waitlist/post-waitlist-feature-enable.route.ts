// 2021

import { inject } from 'inversify'

import { httpPost, NotFoundError, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { WaitlistFeatureInput } from '../../../models/request'
import {
  IWaitlistBusinessService,
  WaitlistBusinessServiceSymbol,
} from '../../../services/business/waitlist/waitlist.business.service'
import { OperationsAccessMiddlewareFactory } from '../../../middleware/access/operations-access.middleware'
import { OperationsAudience } from '../../../models/config'
import validation from '../../../lib/utils/validation'
import { IValidator } from '@ts-awesome/validate'
import { IUserEntityService, UserEntityServiceSymbol } from '../../../models/db'

@httpPost('/api/v1/waitlist/enable', OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }))
export class PostWaitlistFeatureEnableRoute extends Route {
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(WaitlistBusinessServiceSymbol) waitlistBusinessService!: IWaitlistBusinessService

  @inject(validation.symbolFor(WaitlistFeatureInput)) validator!: IValidator<WaitlistFeatureInput>

  @OpenApiOperationPost({
    path: '/api/v1/waitlist/enable',
    description: 'Post waitlist feature enable',
    summary: 'POST waitlist feature enable',
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: WaitlistFeatureInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'Successfully switched on/off the feature for the user' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(WaitlistFeatureInput) body: WaitlistFeatureInput): Promise<void> {
    this.validate(this.validator, body, '')

    const user = await this.userEntityService.getOne({ uid: body.user })
    if (!user) {
      throw new NotFoundError('User is not found')
    }

    await this.waitlistBusinessService.switchFeatureForUserInWaitlist(user.id, body.feature, body.enable)

    return this.empty(StatusCode.Success)
  }
}
