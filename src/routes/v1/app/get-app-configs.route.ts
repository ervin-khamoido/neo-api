2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { AppConfigsOutput } from '../../../models/response'
import { AppConfigSymbol, IAppConfig } from '../../../models/config'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'

@httpGet('/api/v1/app/config', FireAccessMiddleware())
export class GetAppConfigsRoute extends Route {
  @inject(AppConfigSymbol) config!: IAppConfig

  @OpenApiOperationGet({
    path: '/api/v1/app/config',
    description: 'Get application configs',
    summary: 'GET application configs',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Application configs', content: AppConfigsOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    // Note: Update the AppConfigsOutput with any new configs to return them in the JSON response
    return this.json(this.config, AppConfigsOutput)
  }
}
