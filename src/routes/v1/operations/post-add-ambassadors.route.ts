2023

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { UnitOfWorkSymbol, IUnitOfWork } from '@ts-awesome/entity'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import { OperationsAudience } from '../../../models/config'
import { AddAmbassadorsInput } from '../../../models/request'
import { IUserEntityService, UserEntityServiceSymbol } from '../../../models/db'

import { OperationsAccessMiddlewareFactory } from '../../../middleware/access/operations-access.middleware'

import { AmbassadorServiceSymbol, IAmbassadorService } from '../../../services/ambassador.service'

@httpPost(
  '/api/v1/operations/ambassadors/batch-add',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }),
)
export class PostAddOrUpdateAmbassadors extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(AmbassadorServiceSymbol) ambassadorService!: IAmbassadorService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostAddOrUpdateAmbassadors)
  }

  @OpenApiOperationPost({
    path: '/api/v1/operations/ambassadors/batch-add',
    description: `Allows operations to add a list of users to the ambassador program and to update existing ambassador levels`,
    summary: `PATCH allow operations to add a list of users to the ambassador program and to update existing ambassador levels`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: AddAmbassadorsInput,
      },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'Successfully added or updated ambassadors' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(AddAmbassadorsInput) body: AddAmbassadorsInput): Promise<void> {
    const { emails, levelId, agentId } = body

    if (!emails) {
      throw new BadRequestError('Invalid request params')
    }

    if (emails.length < 1) {
      throw new BadRequestError('No ambassadors provided for deletion')
    }

    const users = await this.userEntityService.get(x => x.email.in(emails))

    await this.uow.auto(() =>
      this.ambassadorService.addOrUpdateAmbassadors([...users], levelId, `${OperationsAudience.Retool}:${agentId}`),
    )

    return this.empty(StatusCode.NoContent)
  }
}
