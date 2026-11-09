2021

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { PostEntityOutput } from '../../../../models/response'
import { PurchaseOrderV2Input } from '../../../../models/request'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { AppNotSupportedHttpError } from '../../../../errors'

@httpPost('/api/v2/order/purchase', FireAccessMiddleware({ checkRevoked: true }), PinAccessMiddleware)
export class PostCreatePurchaseOrderRoute extends Route {
  @OpenApiOperationPost({
    path: '/api/v2/order/purchase',
    description: 'Create a purchase order',
    summary: 'POST create a purchase order',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Purchase order information',
        schema: PurchaseOrderV2Input,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Created purchase order', content: PostEntityOutput },
      [StatusCode.Conflict]: {
        description: 'Calculations are not correct or Exchange rate, fee, or agent fee changed',
      },
      [StatusCode.Forbidden]: { description: 'User cannot create an order' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
    deprecated: true,
  })
  public async handle(@requestBody(PurchaseOrderV2Input) body: PurchaseOrderV2Input): Promise<void> {
    throw new AppNotSupportedHttpError()
  }
}
