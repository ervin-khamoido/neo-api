2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, NotFoundError, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'

import { ConflictError } from '../../../../errors'
import { CurrentUserSymbol } from '../../../../middleware'
import validation from '../../../../lib/utils/validation'
import { IUserDetailsEntityService, UserDetailsEntityServiceSymbol, UserModel } from '../../../../models/db'
import { DoBInput } from '../../../../models/request/dob.input'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'
import { addYears, isBefore } from 'date-fns'
import { IUserLevelService, UserLevelServiceSymbol } from '../../../../services/level/user-level.service'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { IsolationLevel } from '@ts-awesome/orm'

const MIN_ACCEPTABLE_AGE_TO_USE_NEOBANK = 18

@httpPost('/api/v1/user/details/dob', FireAccessMiddleware(), PinAccessMiddleware)
export class PostUserDetailsDoBRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(validation.symbolFor(DoBInput)) bodyValidator!: IValidator<DoBInput>

  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService

  @OpenApiOperationPost({
    path: '/api/v1/user/details/dob',
    description: `Post a user's date of birth`,
    summary: `POST a user's date of birth`,
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        schema: DoBInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'The date of birth is set successfully' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.NotFound]: { description: 'User details are not found' },
      [StatusCode.Conflict]: { description: 'The date of birth has already been set. Call /me to get the latest data' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(DoBInput) body: DoBInput): Promise<void> {
    this.validate(this.bodyValidator, body)

    await this.uow.auto(() => this.updateDoB(body))
    await this.userLevelService.triggerLevelPromotion(this.user.id)

    return this.empty(StatusCode.Created)
  }

  private async updateDoB(body: DoBInput): Promise<void> {
    await this.uow.setIsolationLevel(IsolationLevel.RepeatableRead)

    const now = new Date()
    if (isBefore(now, addYears(body.dateOfBirth, MIN_ACCEPTABLE_AGE_TO_USE_NEOBANK))) {
      throw new BadRequestError(`The user has to reach ${MIN_ACCEPTABLE_AGE_TO_USE_NEOBANK} years to use the app`)
    }

    const userDetails = await this.userDetailsEntityService.getOne({ userId: this.user.id })
    if (!userDetails) {
      throw new NotFoundError('User details are not found')
    }

    if (userDetails.dateOfBirth) {
      throw new ConflictError('The date of birth has already been set')
    }

    // TODO: refactor and move this logic to the service
    await this.userDetailsEntityService.updateOne({
      userId: this.user.id,
      dateOfBirth: body.dateOfBirth,
      updatedBy: `user:${this.user.uid}`,
    })
  }
}
