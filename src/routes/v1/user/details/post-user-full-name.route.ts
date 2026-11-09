2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, NotFoundError, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'

import { ConflictError } from '../../../../errors'
import { CurrentUserSymbol } from '../../../../middleware'
import validation from '../../../../lib/utils/validation'
import {
  IUserDetailsEntityService,
  UserBaNameMatchLogSourceEnum,
  UserDetailsEntityServiceSymbol,
  UserDetailsModel,
  UserModel,
} from '../../../../models/db'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'
import { IUserLevelService, UserLevelServiceSymbol } from '../../../../services/level/user-level.service'
import { FullNameInput } from '../../../../models/request/full-name.input'
import { IUserBankAccountService, UserBankAccountServiceSymbol } from '../../../../services/user-bank-account.service'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { IsolationLevel } from '@ts-awesome/orm'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import {
  IUserBaNameMatchLogService,
  UserBaNameMatchLogServiceSymbol,
} from '../../../../services/bank-account/user-ba-name-match-log.service'
import {
  FullNameMatchResult,
  IUserFullNameService,
  UserFullNameServiceSymbol,
} from '../../../../services/user-full-name.service'

@httpPost('/api/v1/user/details/full-name', FireAccessMiddleware(), PinAccessMiddleware)
export class PostUserDetailsFullNameRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(validation.symbolFor(FullNameInput)) bodyValidator!: IValidator<FullNameInput>

  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserBaNameMatchLogServiceSymbol) userBaNameMatchLogService!: IUserBaNameMatchLogService

  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService
  @inject(UserBankAccountServiceSymbol) userBankAccountService!: IUserBankAccountService
  @inject(UserFullNameServiceSymbol) userFullNameService!: IUserFullNameService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostUserDetailsFullNameRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/user/details/full-name',
    description: `Post a user's full name`,
    summary: `POST a user's full name`,
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        schema: FullNameInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'The full name is set successfully' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.NotFound]: { description: 'User details are not found' },
      [StatusCode.Conflict]: { description: 'The full name has already been set. Call /me to get the latest data' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(FullNameInput) body: FullNameInput): Promise<void> {
    this.validate(this.bodyValidator, body)

    const [isSuccess, userDetails, matchResult, newFullName] = await this.uow.auto(() => this.updateFullName(body))

    await this.userBaNameMatchLogService.create(
      userDetails.userId,
      UserBaNameMatchLogSourceEnum.UpdateFullName,
      userDetails,
      null,
      null,
      { ...matchResult, newFullName: newFullName },
    )

    if (!isSuccess) {
      throw new BadRequestError('The full name does not match with your bank account(s)')
    }

    await this.userLevelService.triggerLevelPromotion(this.user.id)

    return this.empty(StatusCode.Created)
  }

  private async updateFullName(body: FullNameInput): Promise<[boolean, UserDetailsModel, FullNameMatchResult, string]> {
    await this.uow.setIsolationLevel(IsolationLevel.RepeatableRead)

    const userDetails = await this.userDetailsEntityService.getOne({ userId: this.user.id })
    if (!userDetails) {
      throw new NotFoundError('User details are not found')
    }

    if (userDetails.firstName || userDetails.lastName) {
      throw new ConflictError('The full name has already been set')
    }

    const newFullName = this.userFullNameService.compose(body)
    if (!newFullName) {
      throw new BadRequestError('Something wrong with your name')
    }

    const matchResult = await this.userBankAccountService.existingUserBankAccountMatch(this.user.id, newFullName)

    if (!matchResult.match) {
      return [false, userDetails, matchResult, newFullName]
    }

    await this.userDetailsEntityService.updateOne({
      userId: this.user.id,
      firstName: body.firstName,
      middleName: body.middleName,
      lastName: body.lastName,
      fullName: newFullName,
      updatedBy: `user:${this.user.uid}`,
    })

    return [true, userDetails, matchResult, newFullName]
  }
}
