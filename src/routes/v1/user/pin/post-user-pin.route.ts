// 2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { UserModel } from '../../../../models/db'
import { PinAuthOutput } from '../../../../models/response'
import { UserPinInput } from '../../../../models/request'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../../middleware'

import { IUserSettingsService, UserSettingsServiceSymbol } from '../../../../services/user-settings.service'
import { IUserSecretsService, UserSecretsServiceSymbol } from '../../../../services/user-secrets.service'
import { AppLockServiceSymbol, IAppLockService } from '../../../../services/app-lock.service'
import { PinCodeServiceSymbol, IPinCodeService } from '../../../../services/pin-code.service'

@httpPost('/api/v1/user/pin', FireAccessMiddleware())
export class PostUserPinRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService
  @inject(UserSecretsServiceSymbol) userSecretsService!: IUserSecretsService
  @inject(PinCodeServiceSymbol) pinCodeService!: IPinCodeService
  @inject(AppLockServiceSymbol) appLockService!: IAppLockService

  @OpenApiOperationPost({
    path: '/api/v1/user/pin',
    description: 'Post save user pin',
    summary: 'POST save user pin',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        schema: UserPinInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Pin token when successfully saved', content: PinAuthOutput },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(UserPinInput) body: UserPinInput): Promise<void> {
    const userSettings = await this.userSettingsService.getUserSettings(this.user.id)
    if (!userSettings) {
      throw new Error('unexpected: user settings not found')
    }

    if (userSettings.enableAppLock) {
      throw new BadRequestError('App lock is already enabled')
    }

    // Enable app lock
    await this.appLockService.enableAppLock(this.user.id)

    // Hash and save the user pin
    await this.pinCodeService.savePinCode(this.user, body.pin)

    const token = await this.pinCodeService.generatePinToken(this.user)

    return this.json({ token }, StatusCode.Created, PinAuthOutput)
  }
}
