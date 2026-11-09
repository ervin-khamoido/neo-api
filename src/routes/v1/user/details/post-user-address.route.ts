2021

import { inject } from 'inversify'

import { httpPost, NotFoundError, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'
import { UnitOfWorkSymbol, IUnitOfWork } from '@ts-awesome/entity'
import { IsolationLevel } from '@ts-awesome/orm'

import validation from '../../../../lib/utils/validation'

import { IUserDetailsEntityService, UserDetailsEntityServiceSymbol, UserModel } from '../../../../models/db'
import { AddressInput } from '../../../../models/request'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'
import { CurrentUserSymbol } from '../../../../middleware'

import { IUserLevelService, UserLevelServiceSymbol } from '../../../../services/level/user-level.service'

@httpPost('/api/v1/user/details/address', FireAccessMiddleware(), PinAccessMiddleware)
export class PostUserDetailsAddressRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(validation.symbolFor(AddressInput)) bodyValidator!: IValidator<AddressInput>

  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService

  @OpenApiOperationPost({
    path: '/api/v1/user/details/address',
    description: `Post a user's address`,
    summary: `POST a user's address`,
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        schema: AddressInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'The address is set successfully' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.NotFound]: { description: 'User details are not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(AddressInput) body: AddressInput): Promise<void> {
    this.validate(this.bodyValidator, body)

    await this.uow.auto(() => this.updateAddress(body))
    await this.userLevelService.triggerLevelPromotion(this.user.id)

    return this.empty(StatusCode.Created)
  }

  private async updateAddress(body: AddressInput): Promise<void> {
    await this.uow.setIsolationLevel(IsolationLevel.RepeatableRead)

    const userDetails = await this.userDetailsEntityService.getOne({ userId: this.user.id })
    if (!userDetails) {
      throw new NotFoundError('User details are not found')
    }

    await this.userDetailsEntityService.updateOne({
      userId: this.user.id,
      address: body,
      updatedBy: `user:${this.user.uid}`,
    })
  }
}
