2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { FireAccessMiddleware } from '../../middleware/access/fire-access.middleware'
import { TransactionAvailabilityConfigSymbol, ITransactionAvailabilityConfig } from '../../models/config'
import { TransactionAvailabilityOutput } from '../../models/response'

@httpGet('/api/v1/transaction/availability', FireAccessMiddleware())
export class GetTransactionAvailabilityInfoRoute extends Route {
  @inject(TransactionAvailabilityConfigSymbol) transactionAvailabilityConfig!: ITransactionAvailabilityConfig

  @OpenApiOperationGet({
    path: '/api/v1/transaction/availability',
    description: 'Get transaction availability info',
    summary: 'GET transaction availability info',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Transaction Availability Info', content: TransactionAvailabilityOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    return this.json(this.transactionAvailabilityConfig, TransactionAvailabilityOutput)
  }
}
