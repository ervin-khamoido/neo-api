// 2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { UserModel } from '../../../../models/db'
import { PinAuthOutput } from '../../../../models/response'
import { OneTimeTokenInput } from '../../../../models/request'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../../middleware'

import { IUserSettingsService, UserSettingsServiceSymbol } from '../../../../services/user-settings.service'
import { IUserSecretsService, UserSecretsServiceSymbol } from '../../../../services/user-secrets.service'
import { IPinCodeService, PinCodeServiceSymbol } from '../../../../services/pin-code.service'
import { AppLockServiceSymbol, IAppLockService } from '../../../../services/app-lock.service'

@httpPost('/api/v1/user/pin/token/one-time', FireAccessMiddleware())
export class PostOneTimeTokenRequestRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService
  @inject(UserSecretsServiceSymbol) userSecretsService!: IUserSecretsService
  @inject(PinCodeServiceSymbol) pinCodeService!: IPinCodeService
  @inject(AppLockServiceSymbol) appLockService!: IAppLockService

  @OpenApiOperationPost({
    path: '/api/v1/user/pin/token/one-time',
    description: 'Ask server for a one-time token',
    summary: 'POST one-time token request',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        schema: OneTimeTokenInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Pin token when successfully saved', content: PinAuthOutput },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Forbidden]: { description: 'Max attempts exceeded' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(OneTimeTokenInput) body: OneTimeTokenInput): Promise<void> {
    await this.pinCodeService.validatePinAttempts(this.user)

    const isCorrectPin = await this.pinCodeService.verifyPinCode(this.user, body.pin)
    if (isCorrectPin) {
      await this.pinCodeService.resetPinAttempts(this.user)
      const oneTimeToken = await this.pinCodeService.generateOneTimeToken(this.user, body.action)

      return this.json({ token: oneTimeToken }, StatusCode.Success, PinAuthOutput)
    } else {
      await this.pinCodeService.trackPinAttempt(this.user)
      throw new BadRequestError('Pin is incorrect')
    }
  }
}
