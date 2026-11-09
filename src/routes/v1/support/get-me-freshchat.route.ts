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
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { UserFreshchatOutput } from '../../../models/response/user-freshchat.output'
import { IUserFreshchatEntityService, UserFreshchatEntityServiceSymbol } from '../../../models/db/user-freshchat.model'

@httpGet('/api/v1/support/me/freshchat', FireAccessMiddleware())
export class GetMeFreshchatRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService
  @inject(UserLevelEntityServiceSymbol) userLevelService!: IUserLevelEntityService
  @inject(UserFreshchatEntityServiceSymbol) userFreshchatService!: IUserFreshchatEntityService

  @OpenApiOperationGet({
    path: '/api/v1/support/me/freshchat',
    description: 'Get current user Freshchat info',
    summary: "GET user's freshchat info",
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: `Current user's Freshchat info`, content: UserFreshchatOutput },
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

    const userFreshchat = await this.userFreshchatService.getOne({ userId: this.user.id })

    const result: UserFreshchatOutput = {
      externalId: this.user.uid,
      restoreId: userFreshchat?.restoreId,
      phone: this.user.phone,
      email: this.user.email,
      firstName: userDetails.fullName ?? undefined,
      lastName: undefined,
      // meta: { ... } // whatever is required
    }

    return this.json(result, UserFreshchatOutput)
  }
}
