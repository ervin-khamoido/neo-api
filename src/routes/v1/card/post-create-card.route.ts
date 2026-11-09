2021

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { CurrentUserSymbol } from '../../../middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

import { UserModel } from '../../../models/db'
import { UserCardInput } from '../../../models/request'
import { PostEntityOutput } from '../../../models/response'

import {
  IVirtualCardBusinessService,
  VirtualCardBusinessServiceSymbol,
} from '../../../services/business/card/virtual-card.business.service'

@httpPost('/api/v1/card', FireAccessMiddleware(), PinAccessMiddleware)
export class PostCreateVirtualCardRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(VirtualCardBusinessServiceSymbol) virtualCardBusinessService!: IVirtualCardBusinessService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PostCreateVirtualCardRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/card',
    description: 'Issue a virtual card for a user',
    summary: 'POST issue a virtual card for a user',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Input needed to create a virtual card',
        schema: UserCardInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Successfully issued virtual card', content: PostEntityOutput },
      [StatusCode.Forbidden]: { description: 'User cannot have a virtual card' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(UserCardInput) body: UserCardInput): Promise<void> {
    // Issue the virtual card
    await this.virtualCardBusinessService.issueVirtualCard(this.user.id, body)

    return this.empty(StatusCode.Created)
  }
}
