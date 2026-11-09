// 2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { UserModel } from '../../../models/db'
import { YieldBalanceOutput } from '../../../models/response'

import { CurrentUserSymbol } from '../../../middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

import { IUserBalanceService, UserBalanceServiceSymbol } from '../../../services/user-balance.service'

@httpGet('/api/v1/user/yield/balance', FireAccessMiddleware(), PinAccessMiddleware)
export class GetUserYieldBalanceRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService

  @OpenApiOperationGet({
    path: '/api/v1/user/yield/balance',
    description: 'Get user yield balance',
    summary: 'GET user yield balance',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Current user yield balance', content: YieldBalanceOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const yieldBalance = await this.userBalanceService.getUserYieldBalance(this.user.uid)

    return this.json(yieldBalance, YieldBalanceOutput)
  }
}
