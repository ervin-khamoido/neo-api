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
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

@httpGet('/api/v1/user/me', FireAccessMiddleware({ skipApproved: true }))
export class GetMeRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService
  @inject(UserLevelEntityServiceSymbol) userLevelService!: IUserLevelEntityService

  @OpenApiOperationGet({
    path: '/api/v1/user/me',
    description: 'Get current user info',
    summary: "GET user's info",
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Current user', content: UserOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
    deprecated: true,
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

    const result: UserOutput = {
      ...this.user,
      userDetails: { ...userDetails, userLevel: { ...userLevel } },
    }

    return this.json(result, UserOutput)
  }
}
