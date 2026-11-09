2023

import { inject } from 'inversify'

import { BadRequestError, httpPatch, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPatch } from '@ts-awesome/openapi'
import { UnitOfWorkSymbol, IUnitOfWork } from '@ts-awesome/entity'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import { OperationsAudience } from '../../../models/config'
import { RemoveAmbassadorsInput } from '../../../models/request'
import { IUserEntityService, UserEntityServiceSymbol } from '../../../models/db'

import { OperationsAccessMiddlewareFactory } from '../../../middleware/access/operations-access.middleware'

import { AmbassadorServiceSymbol, IAmbassadorService } from '../../../services/ambassador.service'

@httpPatch(
  '/api/v1/operations/ambassadors/batch-delete',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }),
)
export class PatchRemoveAmbassadors extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(AmbassadorServiceSymbol) ambassadorService!: IAmbassadorService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PatchRemoveAmbassadors)
  }

  @OpenApiOperationPatch({
    path: '/api/v1/operations/ambassadors/batch-delete',
    description: `Allows operations to remove a list of users from the ambassador program`,
    summary: `PATCH allow operations to remove a list of users from the ambassador program`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: RemoveAmbassadorsInput,
      },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'Successfully removed the list of ambassadors' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(RemoveAmbassadorsInput) body: RemoveAmbassadorsInput): Promise<void> {
    const { emails, agentId } = body

    if (!emails) {
      throw new BadRequestError('Invalid request params')
    }

    if (emails.length < 1) {
      throw new BadRequestError('No ambassadors provided for deletion')
    }

    const users = await this.userEntityService.get(x => x.email.in(emails))

    await this.uow.auto(() =>
      this.ambassadorService.deleteAmbassadors([...users], `${OperationsAudience.Retool}:${agentId}`),
    )

    return this.empty(StatusCode.NoContent)
  }
}
