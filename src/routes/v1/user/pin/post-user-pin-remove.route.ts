// 2021

import { inject } from 'inversify'

import { httpPost, Route, StatusCode } from '@ts-awesome/rest'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { UserModel } from '../../../../models/db'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol, OneTimeAccessMiddleware } from '../../../../middleware'

import { IUserSettingsService, UserSettingsServiceSymbol } from '../../../../services/user-settings.service'
import { IUserSecretsService, UserSecretsServiceSymbol } from '../../../../services/user-secrets.service'
import { IPinCodeService, OneTimeAction, PinCodeServiceSymbol } from '../../../../services/pin-code.service'
import { AppLockServiceSymbol, IAppLockService } from '../../../../services/app-lock.service'

@httpPost(
  '/api/v1/user/pin/remove',
  FireAccessMiddleware(),
  OneTimeAccessMiddleware({ action: OneTimeAction.DisableAppLock }),
)
export class PostUserPinRemoveRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService
  @inject(UserSecretsServiceSymbol) userSecretsService!: IUserSecretsService
  @inject(PinCodeServiceSymbol) pinCodeService!: IPinCodeService
  @inject(AppLockServiceSymbol) appLockService!: IAppLockService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PostUserPinRemoveRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/user/pin/remove',
    description: 'Post user pin remove',
    summary: 'POST user pin remove',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.NoContent]: { description: 'User pin removed successfully' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const userSettings = await this.userSettingsService.getUserSettings(this.user.id)
    if (!userSettings) {
      throw new Error('unexpected: user settings not found')
    }

    if (!userSettings.enableAppLock) {
      this.logger.warn(`Skipping pin delete: App lock is not enabled for user: ${this.user.uid}`)
      return this.empty()
    }

    await this.uow.auto(async () => {
      // Disable app lock
      await this.appLockService.disableAppLock(this.user.id)

      // Remove the user pin code
      await this.pinCodeService.forgetPinCode(this.user.id)
    })

    return this.empty()
  }
}
