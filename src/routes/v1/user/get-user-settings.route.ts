// 2021

import { inject } from 'inversify'

import { httpGet, NotFoundError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { IUserDetailsEntityService, UserDetailsEntityServiceSymbol, UserModel } from '../../../models/db'
import { UserSettingsOutput } from '../../../models/response'

import { IUserSettingsService, UserSettingsServiceSymbol } from '../../../services/user-settings.service'
import { IUserSecretsService, UserSecretsServiceSymbol } from '../../../services/user-secrets.service'

import { CurrentUserSymbol } from '../../../middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { AppConfigSymbol, IAppConfig } from '../../../models/config'

@httpGet('/api/v1/user/settings', FireAccessMiddleware())
export class GetUserSettingsRoute extends Route {
  @inject(AppConfigSymbol) appConfig!: IAppConfig
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService
  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService
  @inject(UserSecretsServiceSymbol) userSecretsService!: IUserSecretsService

  @OpenApiOperationGet({
    path: '/api/v1/user/settings',
    description: 'Get user settings',
    summary: 'GET user settings',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Current user settings', content: UserSettingsOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const userSettings = await this.userSettingsService.getUserSettings(this.user.id)
    if (!userSettings) {
      throw new NotFoundError('User settings not found')
    }

    return this.json(userSettings, UserSettingsOutput)
  }
}
