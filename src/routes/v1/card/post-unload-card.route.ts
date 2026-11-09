2023

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { CurrentUserSymbol } from '../../../middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

import { UserModel } from '../../../models/db'
import { CardOperationInput } from '../../../models/request'
import { PostEntityOutput } from '../../../models/response'

import {
  IVirtualCardBusinessService,
  VirtualCardBusinessServiceSymbol,
} from '../../../services/business/card/virtual-card.business.service'

@httpPost('/api/v1/card/unload', FireAccessMiddleware(), PinAccessMiddleware)
export class PostUnloadVirtualCardRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(VirtualCardBusinessServiceSymbol) virtualCardBusinessService!: IVirtualCardBusinessService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PostUnloadVirtualCardRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/card/unload',
    description: 'Unload a virtual card',
    summary: 'POST unload a virtual card',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Input needed to unload a virtual card',
        schema: CardOperationInput,
      },
    },
    responses: {
      [StatusCode.Accepted]: { description: 'Successfully unloaded the virtual card' },
      [StatusCode.BadRequest]: { description: 'Bad request data' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(CardOperationInput) body: CardOperationInput): Promise<void> {
    await this.virtualCardBusinessService.unloadVirtualCard(this.user.id, body)

    return this.empty(StatusCode.Accepted)
  }
}
