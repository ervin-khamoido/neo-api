2021

import { inject } from 'inversify'

import { httpGet, NotFoundError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentUserSymbol } from '../../../middleware'
import { UserModel } from '../../../models/db'
import { UserOutput } from '../../../models/response'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'
import { IUserReferrerService, UserReferrerServiceSymbol } from '../../../services/referrals/user-referrer.service'

@httpGet('/api/v1/user/invitation-link', FireAccessMiddleware(), PinAccessMiddleware)
export class GetInvitationLinkRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserReferrerServiceSymbol) userReferrerService!: IUserReferrerService

  @OpenApiOperationGet({
    path: '/api/v1/user/invitation-link',
    description: 'Get current user invitation link',
    summary: "GET user's invitation",
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Invitation Link', content: UserOutput },
      [StatusCode.NotFound]: { description: 'User details not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const invitationLink = await this.userReferrerService.getOrCreateInvitationLink(this.user.id)

    if (!invitationLink) {
      throw new NotFoundError('Invitaition Link was not found')
    }

    return this.json(invitationLink, String)
  }
}
