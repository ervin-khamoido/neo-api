2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, NotFoundError, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { UnitOfWorkSymbol, IUnitOfWork } from '@ts-awesome/entity'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import { BlockUserInput } from '../../../models/request'
import { UserEntityServiceSymbol, IUserEntityService } from '../../../models/db'
import { OperationsAudience } from '../../../models/config'

import { OperationsAccessMiddlewareFactory } from '../../../middleware/access/operations-access.middleware'
import {
  IUserAccountManagementService,
  UserAccountManagementServiceSymbol,
} from '../../../services/user-account-management.service'

@httpPost('/api/v1/operations/user/block', OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }))
export class PostUserBlockRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(UserAccountManagementServiceSymbol) userAccountManagementService!: IUserAccountManagementService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostUserBlockRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/operations/user/block',
    description: `Block the user`,
    summary: `POST Block the user`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: BlockUserInput,
      },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'The user was blocked successfully' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.NotFound]: { description: 'User not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(BlockUserInput) body: BlockUserInput): Promise<void> {
    const user = await this.userEntityService.getOne({ uid: body.user })
    if (!user) {
      throw new NotFoundError('User not found')
    }

    try {
      await this.uow.auto(() =>
        this.userAccountManagementService.block(user, `${OperationsAudience.Retool}:${body.agentId}`, body.reason),
      )
    } catch (err: any) {
      this.logger.error(`Failed to block user from operations route [uid: ${body.user}]`)
      this.logger.error(err)

      throw new BadRequestError(err.message)
    }

    return this.empty(StatusCode.NoContent)
  }
}
