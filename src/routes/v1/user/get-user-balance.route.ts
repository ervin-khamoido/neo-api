// 2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentUserSymbol } from '../../../middleware'
import { UserModel } from '../../../models/db'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { WalletBalanceOutput } from '../../../models/response'
import { IUserBalanceService, UserBalanceServiceSymbol } from '../../../services/user-balance.service'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

@httpGet('/api/v1/user/balance', FireAccessMiddleware(), PinAccessMiddleware)
export class GetUserBalanceRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService

  @OpenApiOperationGet({
    path: '/api/v1/user/balance',
    description: 'Get user balance',
    summary: 'GET user balance',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Current user balance', content: WalletBalanceOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const userBalance = await this.userBalanceService.getUserBalance(this.user.id)

    return this.json(userBalance, WalletBalanceOutput)
  }
}
