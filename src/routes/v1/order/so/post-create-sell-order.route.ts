2021

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { SellOrderV1Input } from '../../../../models/request'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { OneTimeAccessMiddleware } from '../../../../middleware'
import { OneTimeAction } from '../../../../services/pin-code.service'
import { STATUS_CODE_GONE } from '../../../../common/constants'
import { AppNotSupportedHttpError } from '../../../../errors'

// BREAKING CHANGE ROUTE: remove it after 1.5.0 gets deprecated
@httpPost(
  '/api/v1/order/sell',
  FireAccessMiddleware({ checkRevoked: true }),
  OneTimeAccessMiddleware({ action: OneTimeAction.CreateSellOrder }),
)
export class PostCreateSellOrderRoute extends Route {
  @OpenApiOperationPost({
    path: '/api/v1/order/sell',
    description: 'Create a sell order',
    summary: 'POST create a sell order',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Sell order information',
        schema: SellOrderV1Input,
      },
    },
    responses: {
      [STATUS_CODE_GONE]: { description: 'The app is not longer supported' },
    },
    deprecated: true,
  })
  public async handle(@requestBody(SellOrderV1Input) body: SellOrderV1Input): Promise<void> {
    throw new AppNotSupportedHttpError()
  }
}
