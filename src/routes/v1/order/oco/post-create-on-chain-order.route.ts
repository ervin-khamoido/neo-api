2023

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { OnChainOrderInput } from '../../../../models/request'
import { PostEntityOutput } from '../../../../models/response'
import { UserModel } from '../../../../models/db'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol, OneTimeAccessMiddleware } from '../../../../middleware'

import {
  IOnChainBusinessService,
  OnChainBusinessServiceSymbol,
} from '../../../../services/business/on-chain/on-chain.business.service'
import { OneTimeAction } from '../../../../services/pin-code.service'

@httpPost(
  '/api/v1/order/on-chain',
  FireAccessMiddleware(),
  OneTimeAccessMiddleware({ action: OneTimeAction.CreateOnChainOrder }),
)
export class PostCreateOnChainOrderRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(OnChainBusinessServiceSymbol) onChainBusinessService!: IOnChainBusinessService

  @OpenApiOperationPost({
    path: '/api/v1/order/on-chain',
    description: 'Creates and sends an on-chain order',
    summary: 'POST Creates and sends an on-chain order',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Input needed to create an on-chain order',
        schema: OnChainOrderInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'On-chain order successfully created', content: PostEntityOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(OnChainOrderInput) body: OnChainOrderInput): Promise<void> {
    const order = await this.onChainBusinessService.sendOnChain(this.user.id, body)

    return this.json({ uid: order.uid }, StatusCode.Success, PostEntityOutput)
  }
}
