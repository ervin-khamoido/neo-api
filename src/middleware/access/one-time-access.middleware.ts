2021

import { inject, injectable, interfaces } from 'inversify'
import { IHttpRequest, IMiddleware } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { UnauthorizedError, UnauthorizedReason } from '../../errors'
import { OneTimeAction } from '../../services/pin-code.service'
import { IOneTimePayload, OneTimeTokenServiceSymbol } from '../../services/token/one-time-token.service'
import { ITokenService } from '../../lib/services/token'
import { ConfigSymbol } from '@ts-awesome/config'
import { IConfig } from 'config'
import { CurrentUserSymbol } from './common'
import { IUserSettingsEntityService, UserModel, UserSettingsEntityServiceSymbol } from '../../models/db'

export const OneTimeTokenHeaderName = 'X-ONE-TIME-TOKEN'

export const AUDIENCE_ONE_TIME = 'one_time_token'

export type OneTimeAccessOptions = {
  action: OneTimeAction
}

// All property injectibles should go into this interface which is then used for unit testing
export interface IOneTimeAccessMiddleware extends IMiddleware {
  loggerFactory: ILoggerFactory
  config: IConfig
  user: UserModel
  userSettingsService: IUserSettingsEntityService
  tokenService: ITokenService<IOneTimePayload>
}

export function OneTimeAccessMiddleware(options: OneTimeAccessOptions): interfaces.Newable<IMiddleware> {
  @injectable()
  class _OneTimeAccessMiddleware implements IOneTimeAccessMiddleware {
    @inject(LoggerFactorySymbol) loggerFactory!: ILoggerFactory
    @inject(ConfigSymbol) config!: IConfig

    @inject(CurrentUserSymbol) user!: UserModel

    @inject(UserSettingsEntityServiceSymbol) userSettingsService!: IUserSettingsEntityService
    @inject(OneTimeTokenServiceSymbol) tokenService!: ITokenService<IOneTimePayload>

    public async handle(req: IHttpRequest): Promise<void> {
      const settings = await this.userSettingsService.getOne({ userId: this.user.id })
      if (!settings?.enableAppLock) {
        return
      }

      const headers = req.headers ?? {}
      const oneTimeToken = headers[OneTimeTokenHeaderName.toLowerCase()]

      if (typeof oneTimeToken !== 'string') {
        throw new UnauthorizedError('', { reason: UnauthorizedReason.OneTimeToken })
      }

      let aud, action

      try {
        const payload = this.tokenService.verify(oneTimeToken)
        aud = payload.aud
        action = payload.action
      } catch (err) {
        throw new UnauthorizedError('', { reason: UnauthorizedReason.OneTimeToken })
      }

      if (!Array.isArray(aud)) {
        throw new UnauthorizedError('', { reason: UnauthorizedReason.OneTimeToken })
      }

      const domain = this.config.get<string>('domain')

      if (!aud?.includes(domain) || !aud?.includes(AUDIENCE_ONE_TIME)) {
        throw new UnauthorizedError('', { reason: UnauthorizedReason.OneTimeToken })
      }

      if (action !== options.action) {
        throw new UnauthorizedError('', { reason: UnauthorizedReason.OneTimeToken })
      }
    }
  }

  return _OneTimeAccessMiddleware
}
