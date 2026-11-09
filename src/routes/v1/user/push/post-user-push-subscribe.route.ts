// 2021

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'

import { UserModel } from '../../../../models/db'
import { PushSubscribeInput } from '../../../../models/request'

import { CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { IPushService, PushServiceSymbol } from '../../../../services/push.service'
import Validation from '../../../../lib/utils/validation'

@httpPost('/api/v1/user/push/subscribe', FireAccessMiddleware())
export class PostUserPushSubscribeRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(Validation.symbolFor(PushSubscribeInput)) validator!: IValidator<PushSubscribeInput>

  @inject(PushServiceSymbol) pushService!: IPushService

  @OpenApiOperationPost({
    path: '/api/v1/user/push/subscribe',
    description: 'Subscribe the current user for push notifications',
    summary: 'Subscribe the current user for push notifications',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        schema: PushSubscribeInput,
      },
    },
    responses: {
      [StatusCode.Success]: {
        description: 'Successfully subscribed for push notifications',
        content: PushSubscribeInput,
      },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(PushSubscribeInput) body: PushSubscribeInput): Promise<void> {
    this.validate(this.validator, body, '')

    await this.pushService.subscribe(this.user, body)

    return this.empty(StatusCode.Success)
  }
}
