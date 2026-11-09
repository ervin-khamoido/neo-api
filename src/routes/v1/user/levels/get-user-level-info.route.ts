2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../../middleware'
import { UserModel } from '../../../../models/db'
import { UserLevelInfoOutput } from '../../../../models/response'
import { IUserLevelService, UserLevelServiceSymbol } from '../../../../services/level/user-level.service'

@httpGet('/api/v1/user/level/info', FireAccessMiddleware())
export class GetUserLevelInfo extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService

  @OpenApiOperationGet({
    path: '/api/v1/user/level/info',
    description: 'Get user levels info',
    summary: 'GET user levels info',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'User levels info output', content: [UserLevelInfoOutput] },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const result = await this.userLevelService.getLevelsInfo(this.user.id)

    return this.json(result, [UserLevelInfoOutput])
  }
}
