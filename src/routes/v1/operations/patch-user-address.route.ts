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

import { AddressInput } from '../../../models/request'
import {
  UserModel,
  UserDetailsEntityServiceSymbol,
  IUserDetailsEntityService,
  userStatusesIneligibleForUpdate,
} from '../../../models/db'
import { EditUserAddressInput } from '../../../models/request/edit-user-address.input'
import { OperationsAudience } from '../../../models/config'

import { OperationsAccessMiddlewareFactory } from '../../../middleware/access/operations-access.middleware'

@httpPatch(
  '/api/v1/operations/user/details/address',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }),
)
export class PatchUserDetailsAddressRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(validation.symbolFor(AddressInput)) addressValidator!: IValidator<AddressInput>

  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PatchUserDetailsAddressRoute)
  }

  @OpenApiOperationPatch({
    path: '/api/v1/operations/user/details/address',
    description: `Patch a user's address`,
    summary: `PATCH a user's address`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: EditUserAddressInput,
      },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'The address was updated successfully' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.NotFound]: { description: 'User details not found' },
      [StatusCode.Conflict]: { description: 'User account is in an invalid state for updates.' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(EditUserAddressInput) body: EditUserAddressInput): Promise<void> {
    this.validate(this.addressValidator, body.address)

    await this.uow.auto(() => this.updateAddress(body))

    return this.empty(StatusCode.NoContent)
  }

  private async updateAddress(body: EditUserAddressInput): Promise<void> {
    await this.uow.setIsolationLevel(IsolationLevel.RepeatableRead)

    const { user, agentId, address } = body

    const userDetails = await this.userDetailsEntityService
      .select()
      .join(UserModel, (root, other) => root.userId.eq(other.id))
      .where(() => of(UserModel, 'uid').eq(user))
      .fetchOne()

    if (!userDetails) {
      this.logger.error(`critical: User details not found for user ${user} during operations address update`)
      throw new NotFoundError(`User information not found.`)
    }

    // Make sure the user's account isn't in an invalid status for updates
    if (userStatusesIneligibleForUpdate.includes(userDetails.status)) {
      this.logger.error(`critical: User account is in invalid status for updates. User: ${user} Agent ID: ${agentId}`)
      throw new ConflictError(`User account is in an invalid state for updates.`)
    }

    await this.userDetailsEntityService.updateOne({
      userId: userDetails.userId,
      address: address,
      updatedBy: `retool:${agentId}`,
    })
  }
}
