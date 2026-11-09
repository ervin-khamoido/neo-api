// 2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, Route, StatusCode } from '@ts-awesome/rest'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { UserModel } from '../../../../models/db'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../../middleware'

import { IUserSettingsService, UserSettingsServiceSymbol } from '../../../../services/user-settings.service'
import { IUserSecretsService, UserSecretsServiceSymbol } from '../../../../services/user-secrets.service'
import { IPinCodeService, PinCodeServiceSymbol } from '../../../../services/pin-code.service'
import { AppLockServiceSymbol, IAppLockService } from '../../../../services/app-lock.service'
import { IMailerService, MailerServiceSymbol } from '../../../../lib/services/mailer'
import { MailTemplates } from '../../../../services/mailer/mailgun.service'

@httpPost('/api/v1/user/pin/forgot', FireAccessMiddleware({ checkRevoked: true }))
export class PostUserPinForgotRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService
  @inject(UserSecretsServiceSymbol) userSecretsService!: IUserSecretsService
  @inject(PinCodeServiceSymbol) pinCodeService!: IPinCodeService
  @inject(AppLockServiceSymbol) appLockService!: IAppLockService

  @inject(MailerServiceSymbol) mailerService!: IMailerService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PostUserPinForgotRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/user/pin/forgot',
    description: 'Post user pin forgot',
    summary: 'POST user pin forgot',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.NoContent]: { description: 'Email with a new pin code sent successfully' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const userSettings = await this.userSettingsService.getUserSettings(this.user.id)
    if (!userSettings) {
      throw new Error('unexpected: user settings not found')
    }

    if (!userSettings.enableAppLock) {
      throw new BadRequestError("User's app lock is disabled")
    }

    await this.uow.auto(() => this.forgotPin())

    return this.empty()
  }

  private async forgotPin(): Promise<void> {
    // Generate random pin for a user
    const pin = await this.pinCodeService.randomPinCode(this.user)

    await this.pinCodeService.resetPinAttempts(this.user)

    await this.mailerService.send({
      to: this.user.email,
      subject: 'Neobank Pin Code Reset',
      template: {
        name: MailTemplates.PinReset,
        variables: {
          pin: pin,
        },
        conditionalContent: {},
      },
    })
  }
}
