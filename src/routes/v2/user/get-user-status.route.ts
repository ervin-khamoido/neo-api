2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentUserSymbol } from '../../../middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'

import { UserModel } from '../../../models/db'
import { UserStatusOutput } from '../../../models/response'
import { AppConfigSymbol, IAppConfig } from '../../../models/config'

import { IUserStatusService, UserStatusServiceSymbol } from '../../../services/user-status.service'

@httpGet('/api/v2/user/status', FireAccessMiddleware({ skipApproved: true }))
export class GetUserStatusRoute extends Route {
  @inject(AppConfigSymbol) appConfig!: IAppConfig
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserStatusServiceSymbol) userStatusService!: IUserStatusService

  @OpenApiOperationGet({
    path: '/api/v2/user/status',
    description: 'Get current user status',
    summary: "GET user's info",
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Current user', content: UserStatusOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const status = await this.userStatusService.calculateUserStatus(this.user.id)

    return this.json({ status }, UserStatusOutput)
  }
}
