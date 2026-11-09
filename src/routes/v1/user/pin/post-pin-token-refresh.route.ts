// 2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { NotFoundError } from '@ts-awesome/orm'

import { UserModel } from '../../../../models/db'
import { PinTokenRefreshInput } from '../../../../models/request'
import { PinTokenRefreshOutput } from '../../../../models/response'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../../middleware'

import { IUserSecretsService, UserSecretsServiceSymbol } from '../../../../services/user-secrets.service'
import { IUserSettingsService, UserSettingsServiceSymbol } from '../../../../services/user-settings.service'
import { IPinCodeService, PinCodeServiceSymbol } from '../../../../services/pin-code.service'
import { AppLockServiceSymbol, IAppLockService } from '../../../../services/app-lock.service'

@httpPost('/api/v1/user/pin/token/refresh', FireAccessMiddleware())
export class PostUserPinTokenRefreshRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService
  @inject(UserSecretsServiceSymbol) userSecretsService!: IUserSecretsService
  @inject(PinCodeServiceSymbol) pinCodeService!: IPinCodeService
  @inject(AppLockServiceSymbol) appLockService!: IAppLockService

  @OpenApiOperationPost({
    path: '/api/v1/user/pin/token/refresh',
    description: "Refresh user's token",
    summary: "'Refresh user's token'",
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        schema: PinTokenRefreshInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: `New user's pin token`, content: PinTokenRefreshOutput },
      [StatusCode.BadRequest]: { description: 'Invalid pin code' },
      [StatusCode.Forbidden]: { description: 'Max attempts exceeded. Reset PIN code' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(PinTokenRefreshInput) body: PinTokenRefreshInput): Promise<void> {
    const settings = await this.userSettingsService.getUserSettings(this.user.id)
    if (!settings) {
      throw new NotFoundError('User settings not found')
    }

    if (settings.enableAppLock) {
      await this.pinCodeService.validatePinAttempts(this.user)

      const isCorrectPin = await this.pinCodeService.verifyPinCode(this.user, body.pin)
      if (!isCorrectPin) {
        await this.pinCodeService.trackPinAttempt(this.user)
        throw new BadRequestError('Invalid pin')
      }

      await this.pinCodeService.resetPinAttempts(this.user)
      const token = await this.pinCodeService.generatePinToken(this.user)

      return this.json({ token }, StatusCode.Success, PinTokenRefreshOutput)
    } else {
      // TODO: user switched off the app lock on a different phone?
    }
  }
}
