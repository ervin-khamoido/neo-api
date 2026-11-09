2021

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { OneTimeAccessMiddleware } from '../../../../middleware'
import { OneTimeAction } from '../../../../services/pin-code.service'
import { SellOrderV2Input } from '../../../../models/request'
import { PostEntityOutput } from '../../../../models/response'
import { AppNotSupportedHttpError } from '../../../../errors'

@httpPost(
  '/api/v2/order/sell',
  FireAccessMiddleware({ checkRevoked: true }),
  OneTimeAccessMiddleware({ action: OneTimeAction.CreateSellOrder }),
)
export class PostCreateSellOrderRoute extends Route {
  @OpenApiOperationPost({
    path: '/api/v2/order/sell',
    description: 'Create a sell order',
    summary: 'POST create a sell order',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Sell order information',
        schema: SellOrderV2Input,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Created sell order', content: PostEntityOutput },
      [StatusCode.Conflict]: {
        description: 'Calculations are not correct or Exchange rate, fee, or agent fee changed',
      },
      [StatusCode.Forbidden]: { description: 'User cannot create an order' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
    deprecated: true,
  })
  public async handle(@requestBody(SellOrderV2Input) body: SellOrderV2Input): Promise<void> {
    throw new AppNotSupportedHttpError()
  }
}
