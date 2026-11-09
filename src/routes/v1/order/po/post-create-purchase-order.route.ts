2021

import { httpPost, requestBody, Route } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'
import { AppNotSupportedHttpError } from '../../../../errors'
import { STATUS_CODE_GONE } from '../../../../common/constants'
import { PurchaseOrderV1Input } from '../../../../models/request'

// BREAKING CHANGE ROUTE: remove it after 1.5.0 gets deprecated
@httpPost('/api/v1/order/purchase', FireAccessMiddleware({ checkRevoked: true }), PinAccessMiddleware)
export class PostCreatePurchaseOrderRoute extends Route {
  @OpenApiOperationPost({
    path: '/api/v1/order/purchase',
    description: 'Create a purchase order',
    summary: 'POST create a purchase order',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Purchase order information',
        schema: PurchaseOrderV1Input,
      },
    },
    responses: {
      [STATUS_CODE_GONE]: { description: 'The app is not longer supported' },
    },
    deprecated: true,
  })
  public async handle(@requestBody(PurchaseOrderV1Input) body: PurchaseOrderV1Input): Promise<void> {
    throw new AppNotSupportedHttpError()
  }
}
