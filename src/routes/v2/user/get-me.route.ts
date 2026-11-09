2021

import { inject } from 'inversify'

import { httpGet, NotFoundError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentUserSymbol } from '../../../middleware'
import {
  IUserDetailsEntityService,
  IUserLevelEntityService,
  UserDetailsEntityServiceSymbol,
  UserLevelEntityServiceSymbol,
  UserModel,
} from '../../../models/db'
import { UserOutput } from '../../../models/response'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { obscureUser } from '../../../utils/obscure-user'
import { BranchIOService, BranchIOServiceSymbol } from '../../../services/branch.service'

@httpGet('/api/v2/user/me', FireAccessMiddleware({ skipApproved: true }))
export class GetMeRouteV2 extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService
  @inject(BranchIOServiceSymbol) branchIOService!: BranchIOService
  @inject(UserLevelEntityServiceSymbol) userLevelService!: IUserLevelEntityService

  @OpenApiOperationGet({
    path: '/api/v2/user/me',
    description: 'Get current user info',
    summary: "GET user's info",
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Current user', content: UserOutput },
      [StatusCode.NotFound]: { description: 'User details not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const userDetails = await this.userDetailsService.getOne({ userId: this.user.id })
    if (!userDetails) {
      throw new NotFoundError('User details does not exist')
    }

    const userLevel = await this.userLevelService.getOne({ id: userDetails.userLevelId })
    if (!userLevel) {
      throw new NotFoundError('User level does not exist')
    }

    obscureUser(this.user)

    const result: UserOutput = {
      ...this.user,
      userDetails: { ...userDetails, userLevel: { ...userLevel } },
    }

    return this.json(result, UserOutput)
  }
}
