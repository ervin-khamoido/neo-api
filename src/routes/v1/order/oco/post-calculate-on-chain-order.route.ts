2023

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { CalculateOnChainOrderInput } from '../../../../models/request'
import { CalculateOnChainOrderOutput } from '../../../../models/response'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'

import {
  IOnChainBusinessService,
  OnChainBusinessServiceSymbol,
} from '../../../../services/business/on-chain/on-chain.business.service'

@httpPost('/api/v1/calculate/order/on-chain', FireAccessMiddleware())
export class PostCalculateOnChainOrderRoute extends Route {
  @inject(OnChainBusinessServiceSymbol) onChainBusinessService!: IOnChainBusinessService

  @OpenApiOperationPost({
    path: '/api/v1/calculate/order/on-chain',
    description: 'Calculates necessary values for an on-chain order',
    summary: 'POST Calculates necessary values for an on-chain order',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Input needed to calculate an on-chain order',
        schema: CalculateOnChainOrderInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'On-chain order totals calculated', content: CalculateOnChainOrderOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(CalculateOnChainOrderInput) body: CalculateOnChainOrderInput): Promise<void> {
    const result = await this.onChainBusinessService.calculateOnChainOrder(body)

    return this.json(result, StatusCode.Success, CalculateOnChainOrderOutput)
  }
}
