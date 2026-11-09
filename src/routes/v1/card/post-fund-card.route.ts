2023

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { CurrentUserSymbol, OneTimeAccessMiddleware } from '../../../middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

import { UserModel } from '../../../models/db'
import { CardOperationInput } from '../../../models/request'

import {
  IVirtualCardBusinessService,
  VirtualCardBusinessServiceSymbol,
} from '../../../services/business/card/virtual-card.business.service'
import { OneTimeAction } from '../../../services/pin-code.service'

@httpPost(
  '/api/v1/card/fund',
  FireAccessMiddleware(),
  OneTimeAccessMiddleware({
    action: OneTimeAction.CreateFundCardOrder,
  }),
)
export class PostFundVirtualCardRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(VirtualCardBusinessServiceSymbol) virtualCardBusinessService!: IVirtualCardBusinessService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PostFundVirtualCardRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/card/fund',
    description: 'Fund a virtual card',
    summary: 'POST fund a virtual card',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Input needed to fund a virtual card',
        schema: CardOperationInput,
      },
    },
    responses: {
      [StatusCode.Accepted]: { description: 'Successfully started funding' },
      [StatusCode.BadRequest]: { description: 'Bad request data' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(CardOperationInput) body: CardOperationInput): Promise<void> {
    await this.virtualCardBusinessService.fundVirtualCard(this.user.id, body)

    return this.empty(StatusCode.Accepted)
  }
}
