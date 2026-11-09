2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { UserModel } from '../../../models/db'
import { MaxAvailableActionLimitOutput } from '../../../models/response'

import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../middleware'

import { UserLimitServiceSymbol, IUserLimitService } from '../../../services/user-limit.service'

@httpGet('/api/v2/user/limits', FireAccessMiddleware(), PinAccessMiddleware)
export class GetLimitsRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserLimitServiceSymbol) userLimitService!: IUserLimitService

  @OpenApiOperationGet({
    path: '/api/v2/user/limits',
    description: 'Get user limits',
    summary: 'GET user limits',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Max Available Action Limits', content: [MaxAvailableActionLimitOutput] },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const limits = await this.userLimitService.getMaxAvailableActionLimits(this.user.id)

    return this.json(limits, [MaxAvailableActionLimitOutput])
  }
}
