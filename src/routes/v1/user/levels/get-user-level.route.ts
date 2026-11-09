// 2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentUserSymbol } from '../../../../middleware'
import { UserModel } from '../../../../models/db'
import { UserCurrentLevelOutput } from '../../../../models/response/user-current-level.output'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

import { IUserLevelService, UserLevelServiceSymbol } from '../../../../services/level/user-level.service'
import { IUserLevelLimitService, UserLevelLimitServiceSymbol } from '../../../../services/user-level-limit.service'

@httpGet('/api/v1/user/level', FireAccessMiddleware(), PinAccessMiddleware)
export class GetUserLevelRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService
  @inject(UserLevelLimitServiceSymbol) userLevelLimitService!: IUserLevelLimitService

  @OpenApiOperationGet({
    path: '/api/v1/user/level',
    description: 'Get user level',
    summary: 'GET user level',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Current user level', content: UserCurrentLevelOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const userLevel = await this.userLevelService.getUserLevel(this.user.id)
    const userLimits = await this.userLevelLimitService.getUserLevelLimits(this.user.id)

    return this.json({ ...userLevel, limits: userLimits }, UserCurrentLevelOutput)
  }
}
