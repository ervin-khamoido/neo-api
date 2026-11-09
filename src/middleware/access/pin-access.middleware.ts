2021

import { inject, injectable } from 'inversify'

import { ForbiddenError, IHttpRequest, IMiddleware } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { CurrentUserSymbol } from './common'

import { UserModel } from '../../models/db'

import { IUserSettingsService, UserSettingsServiceSymbol } from '../../services/user-settings.service'
import { ITokenService } from '../../lib/services/token'
import { IPinPayload, PinTokenServiceSymbol } from '../../services/token'

import { UnauthorizedReason, UnauthorizedError } from '../../errors'

export const TOKEN_HEADER_NAME: string = 'X-Pin-Token'

@injectable()
export class PinAccessMiddleware implements IMiddleware {
  public static AUDIENCE = 'pin'

  @inject(LoggerFactorySymbol) loggerFactory!: ILoggerFactory

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(PinTokenServiceSymbol) tokenService!: ITokenService<IPinPayload>
  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService

  public async handle(req: IHttpRequest): Promise<void> {
    const userSettings = await this.userSettingsService.getUserSettings(this.user.id)
    if (!userSettings) {
      throw new ForbiddenError()
    }

    // Skip pin token verification if app lock is not enabled
    const { enableAppLock } = userSettings
    if (!enableAppLock) {
      return
    }

    // Verify pin access token is in the req
    const pinAccessToken = req.headers[TOKEN_HEADER_NAME.toLowerCase()]
    if (!pinAccessToken || Array.isArray(pinAccessToken)) {
      throw new UnauthorizedError('', { reason: UnauthorizedReason.PinCodeToken })
    }

    // Verify the token and the user uid
    let payload: IPinPayload | null
    try {
      payload = await this.tokenService.verify(pinAccessToken)
    } catch (err) {
      throw new UnauthorizedError('', { reason: UnauthorizedReason.PinCodeToken })
    }
    if (payload.user !== this.user.uid) {
      // user uses a pin token which does not belong to him
      throw new UnauthorizedError()
    }

    // Verify the pin token audience
    if (Array.isArray(payload.aud)) {
      if (!payload.aud.includes(PinAccessMiddleware.AUDIENCE)) {
        throw new UnauthorizedError()
      }
    } else {
      if (payload.aud !== PinAccessMiddleware.AUDIENCE) {
        throw new UnauthorizedError()
      }
    }
  }
}
