2021

import { inject } from 'inversify'

import { BadRequestError, httpPatch, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { OpenApiOperationPatch } from '@ts-awesome/openapi'

import { UserModel } from '../../../../models/db'
import { PinAuthOutput } from '../../../../models/response'
import { ChangeUserPinInput } from '../../../../models/request'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol, OneTimeAccessMiddleware } from '../../../../middleware'

import { IUserSettingsService, UserSettingsServiceSymbol } from '../../../../services/user-settings.service'
import { PinCodeServiceSymbol, IPinCodeService, OneTimeAction } from '../../../../services/pin-code.service'
import { BadRequestContextError, ValidationMessageContext } from '../../../../errors/bad-request-context.error'

@httpPatch('/api/v1/user/pin', FireAccessMiddleware(), OneTimeAccessMiddleware({ action: OneTimeAction.ChangePin }))
export class PatchChangeUserPinRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService
  @inject(PinCodeServiceSymbol) pinCodeService!: IPinCodeService

  @OpenApiOperationPatch({
    path: '/api/v1/user/pin',
    description: 'Patch change user pin',
    summary: 'PATCH change user pin',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        schema: ChangeUserPinInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Pin token when successfully changed', content: PinAuthOutput },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(ChangeUserPinInput) body: ChangeUserPinInput): Promise<void> {
    const userSettings = await this.userSettingsService.getUserSettings(this.user.id)
    if (!userSettings) {
      throw new Error('unexpected: user settings not found')
    }

    if (!userSettings.enableAppLock) {
      throw new BadRequestError('App lock is not enabled')
    }

    const isOldPin = await this.pinCodeService.verifyPinCode(this.user, body.pin)
    if (isOldPin) {
      throw new BadRequestContextError(new ValidationMessageContext("Can't re-enter old pin"))
    }

    await this.pinCodeService.validatePinAttempts(this.user)

    // Hash and save the new user pin
    await this.pinCodeService.savePinCode(this.user, body.pin)

    const token = await this.pinCodeService.generatePinToken(this.user)

    return this.json({ token }, StatusCode.Created, PinAuthOutput)
  }
}
