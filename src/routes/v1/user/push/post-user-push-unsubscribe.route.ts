// 2021

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { UserModel } from '../../../../models/db'
import { PushUnsubscribeInput } from '../../../../models/request'

import { CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import Validation from '../../../../lib/utils/validation'
import { IValidator } from '@ts-awesome/validate'
import { IPushService, PushServiceSymbol } from '../../../../services/push.service'

@httpPost('/api/v1/user/push/unsubscribe', FireAccessMiddleware())
export class PostUserPushUnsubscribeRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(Validation.symbolFor(PushUnsubscribeInput)) validator!: IValidator<PushUnsubscribeInput>

  @inject(PushServiceSymbol) pushService!: IPushService

  @OpenApiOperationPost({
    path: '/api/v1/user/push/unsubscribe',
    description: 'Unsubscribe the current user for push notifications',
    summary: 'Unsubscribe the current user for push notifications',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        schema: PushUnsubscribeInput,
      },
    },
    responses: {
      [StatusCode.Success]: {
        description: 'Successfully unsubscribed from push notifications',
        content: PushUnsubscribeInput,
      },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(PushUnsubscribeInput) body: PushUnsubscribeInput): Promise<void> {
    await this.pushService.unsubscribe(this.user, body)

    return this.empty(StatusCode.Success)
  }
}
