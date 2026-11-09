2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { FeatureWaitlistEntityServiceSymbol, IFeatureWaitlistEntityService, UserModel } from '../../../models/db'
import { WaitlistOutput } from '../../../models/response'
import { CurrentUserSymbol } from '../../../middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'

@httpGet('/api/v1/waitlist', FireAccessMiddleware())
export class GetWaitlistRoute extends Route {
  @inject(CurrentUserSymbol) currentUser!: UserModel

  @inject(FeatureWaitlistEntityServiceSymbol) featureWaitlist!: IFeatureWaitlistEntityService

  @OpenApiOperationGet({
    path: '/api/v1/waitlist',
    description: "Get the user's waitlist",
    summary: "GET the user's waitlist",
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: "User's waitlist items", content: [WaitlistOutput] },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const waitlist = await this.featureWaitlist.get({ userId: this.currentUser.id })

    return this.json(waitlist, [WaitlistOutput])
  }
}
