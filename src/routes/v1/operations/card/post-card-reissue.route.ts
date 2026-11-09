2021

import { inject } from 'inversify'

import { httpPost, NotFoundError, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import { OperationsAccessMiddlewareFactory } from '../../../../middleware/access/operations-access.middleware'
import { OperationsAudience } from '../../../../models/config'
import {
  IVirtualCardBusinessService,
  VirtualCardBusinessServiceSymbol,
} from '../../../../services/business/card/virtual-card.business.service'
import { ReissueCardInput } from '../../../../models/request'
import { IUserEntityService, UserEntityServiceSymbol } from '../../../../models/db'

@httpPost('/api/v1/operations/card/reissue', OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }))
export class PostCardReissueRoute extends Route {
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(VirtualCardBusinessServiceSymbol) virtualCardBusinessService!: IVirtualCardBusinessService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostCardReissueRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/operations/card/reissue',
    description: `Reissue the virtual card for a user`,
    summary: `Reissue the virtual card for a user`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: ReissueCardInput,
      },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'The user was unblocked successfully' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.NotFound]: { description: 'User not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(ReissueCardInput) body: ReissueCardInput): Promise<void> {
    const user = await this.userEntityService.getOne({ uid: body.user })
    if (!user) {
      throw new NotFoundError('User not found')
    }

    await this.virtualCardBusinessService.reissueVirtualCard(user.id)

    return this.empty(StatusCode.NoContent)
  }
}
