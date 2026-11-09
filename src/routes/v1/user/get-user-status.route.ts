2021

import { inject } from 'inversify'

import { BadRequestError, httpGet, NotFoundError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentUserSymbol } from '../../../middleware'
import { UserModel, UserStatus } from '../../../models/db'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { UserStatusOutput } from '../../../models/response'
import { AppConfigSymbol, IAppConfig } from '../../../models/config'
import { IUserStatusService, UserStatusServiceSymbol } from '../../../services/user-status.service'

@httpGet('/api/v1/user/status', FireAccessMiddleware({ skipApproved: true }))
export class GetUserStatusRoute extends Route {
  @inject(AppConfigSymbol) appConfig!: IAppConfig
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserStatusServiceSymbol) userStatusService!: IUserStatusService

  @OpenApiOperationGet({
    path: '/api/v1/user/status',
    description: 'Get current user status',
    summary: "GET user's info",
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Current user', content: UserStatusOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
    deprecated: true,
  })
  public async handle(): Promise<void> {
    const status = await this.calculateUserStatus()

    return this.json({ status }, UserStatusOutput)
  }

  private async calculateUserStatus(): Promise<UserStatus> {
    const oldStatuses = [UserStatus.ApprovalRequired, UserStatus.PinResetRequired, UserStatus.Active]
    const status = await this.userStatusService.calculateUserStatus(this.user.id)

    if (!oldStatuses.includes(status)) {
      throw new BadRequestError('You are using an outdated app. Please update the app before continuing.')
    }

    return status
  }
}
