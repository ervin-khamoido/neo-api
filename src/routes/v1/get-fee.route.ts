2021

import { httpGet, Route } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { FireAccessMiddleware } from '../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../middleware/access/pin-access.middleware'

import { AppNotSupportedHttpError } from '../../errors'
import { STATUS_CODE_GONE } from '../../common/constants'

// BREAKING CHANGE ROUTE: remove it after 1.5.0 gets deprecated
@httpGet('/api/v1/fees', FireAccessMiddleware(), PinAccessMiddleware)
export class GetFeeRoute extends Route {
  @OpenApiOperationGet({
    path: '/api/v1/fees',
    description: 'Get fees info',
    summary: 'GET fees info',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [STATUS_CODE_GONE]: { description: 'The app is not longer supported' },
    },
    deprecated: true,
  })
  public async handle(): Promise<void> {
    throw new AppNotSupportedHttpError()
  }
}
