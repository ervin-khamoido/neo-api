2023

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { PerTransactionLimitsOutput } from '../../../models/response'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'

import { AppConfigSymbol, IAppConfig } from '../../../models/config'

@httpGet('/api/v1/order/transaction/limits', FireAccessMiddleware())
export class GetPerTransactionLimitsRoute extends Route {
  @inject(AppConfigSymbol) appConfig!: IAppConfig

  @OpenApiOperationGet({
    path: '/api/v1/order/transaction/limits',
    description: 'Get the limits per order/transaction',
    summary: 'GET the limits per order/transaction',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Per Transaction Limits', content: PerTransactionLimitsOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    return this.json(this.appConfig.perTransactionLimits, PerTransactionLimitsOutput)
  }
}
