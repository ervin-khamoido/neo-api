2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'

import { UserModel } from '../../../../models/db'
import { ReferrerInfoOutput } from '../../../../models/response'

import { IUserReferrerService, UserReferrerServiceSymbol } from '../../../../services/referrals/user-referrer.service'

@httpGet('/api/v1/user/referrer/info', FireAccessMiddleware())
export class GetUserReferrerInfoRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserReferrerServiceSymbol) userReferrerService!: IUserReferrerService

  @OpenApiOperationGet({
    path: '/api/v1/user/referrer/info',
    description: 'Get user referrer info',
    summary: 'GET user referrer info',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Referrer information', content: ReferrerInfoOutput },
      [StatusCode.NotFound]: { description: 'User details which store referrer info is not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const info = await this.userReferrerService.getReferrerInfo(this.user.id)

    return this.json(info, ReferrerInfoOutput)
  }
}
