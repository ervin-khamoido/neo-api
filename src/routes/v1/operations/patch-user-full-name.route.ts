2021

import { inject } from 'inversify'

import { httpPatch, NotFoundError, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPatch } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'
import { UnitOfWorkSymbol, IUnitOfWork } from '@ts-awesome/entity'
import { IsolationLevel, of } from '@ts-awesome/orm'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import { ConflictError } from '../../../errors'

import validation from '../../../lib/utils/validation'

import {
  UserModel,
  UserDetailsEntityServiceSymbol,
  IUserDetailsEntityService,
  userStatusesIneligibleForUpdate,
} from '../../../models/db'
import { OperationsAudience } from '../../../models/config'
import { EditUserFullNameInput, FullNameInput } from '../../../models/request'

import { OperationsAccessMiddlewareFactory } from '../../../middleware/access/operations-access.middleware'

import { IUserFullNameService, UserFullNameServiceSymbol } from '../../../services/user-full-name.service'

@httpPatch(
  '/api/v1/operations/user/details/full-name',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }),
)
export class PatchUserDetailsFullNameRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(validation.symbolFor(FullNameInput)) fullNameValidator!: IValidator<FullNameInput>

  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService

  @inject(UserFullNameServiceSymbol) userFullNameService!: IUserFullNameService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PatchUserDetailsFullNameRoute)
  }

  @OpenApiOperationPatch({
    path: '/api/v1/operations/user/details/full-name',
    description: `Patch a user's full name`,
    summary: `PATCH a user's full name`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: EditUserFullNameInput,
      },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'The full name was updated successfully' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.NotFound]: { description: 'User details not found' },
      [StatusCode.Conflict]: { description: 'User account is in an invalid state for updates.' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(EditUserFullNameInput) body: EditUserFullNameInput): Promise<void> {
    this.validate(this.fullNameValidator, body.fullName)

    await this.uow.auto(() => this.updateFullName(body))

    return this.empty(StatusCode.NoContent)
  }

  private async updateFullName(body: EditUserFullNameInput): Promise<void> {
    await this.uow.setIsolationLevel(IsolationLevel.RepeatableRead)

    const { user, fullName, agentId } = body

    const userDetails = await this.userDetailsEntityService
      .select()
      .join(UserModel, (root, other) => root.userId.eq(other.id))
      .where(() => of(UserModel, 'uid').eq(user))
      .fetchOne()

    if (!userDetails) {
      this.logger.error(`critical: User details not found for user ${user} during operations full name update`)
      throw new NotFoundError(`User information not found.`)
    }

    // Make sure the user's account isn't in an invalid status for updates
    if (userStatusesIneligibleForUpdate.includes(userDetails.status)) {
      this.logger.error(`critical: User account is in invalid status for updates. User: ${user} Agent ID: ${agentId}`)
      throw new ConflictError(`Customer account is in an invalid state for updates.`)
    }

    const newFullName = await this.userFullNameService.compose(fullName)
    if (!newFullName) {
      this.logger.error(`unexpected: Could not compose the full name from the input provided. Input: ${fullName}`)
      throw new Error('An unexpected error occurred. Could not compose the full name from the input provided.')
    }

    await this.userDetailsEntityService.updateOne({
      userId: userDetails.userId,
      firstName: fullName.firstName,
      middleName: fullName.middleName,
      lastName: fullName.lastName,
      fullName: newFullName,
      updatedBy: `retool:${agentId}`,
    })
  }
}
