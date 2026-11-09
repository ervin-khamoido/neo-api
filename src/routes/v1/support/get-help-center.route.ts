2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { HelpCenterCategoryOutput } from '../../../models/response'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { ISupportService, SupportServiceSymbol } from '../../../services/support.service'
import { FreshdeskServiceSymbol, IFreshdeskService } from '../../../services/freshdesk.service'

@httpGet('/api/v1/support/help-center', FireAccessMiddleware({ skipBlockedCheck: true }))
export class GetHelpCenterRoute extends Route {
  @inject(SupportServiceSymbol) supportService!: ISupportService
  @inject(FreshdeskServiceSymbol) freshdeskService!: IFreshdeskService

  @OpenApiOperationGet({
    path: '/api/v1/support/help-center',
    description: 'Get Help Center',
    summary: 'GET Help Center',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Help Center', content: [HelpCenterCategoryOutput] },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const helpCenter = await this.supportService.getHelpCenter()

    return this.json(helpCenter, [HelpCenterCategoryOutput])
  }
}
