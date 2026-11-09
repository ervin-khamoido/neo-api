2021

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { UserLimitsOutput } from '../../../models/response'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'
import { AppNotSupportedHttpError } from '../../../errors'

@httpGet('/api/v1/user/limits', FireAccessMiddleware(), PinAccessMiddleware)
export class GetLimitsRoute extends Route {
  @OpenApiOperationGet({
    path: '/api/v1/user/limits',
    description: 'Get user limits',
    summary: 'GET user limits',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Limits', content: UserLimitsOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
    deprecated: true,
  })
  public async handle(): Promise<void> {
    throw new AppNotSupportedHttpError()
  }
}
