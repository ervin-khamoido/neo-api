2021

import { inject } from 'inversify'

import { httpPost, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { ConfigurationAccessMiddleware } from '../../../middleware/access/configuration-access.middleware'
import {
  IReceiveMoneyBusinessService,
  ReceiveMoneyBusinessServiceSymbol,
} from '../../../services/business/receive/receive-money.business.service'

@httpPost('/api/v1/job/incoming-wallet-processor', ConfigurationAccessMiddleware)
export class PostIncomingWalletProcessorRoute extends Route {
  @inject(ReceiveMoneyBusinessServiceSymbol) receiveMoneyBusinessService!: IReceiveMoneyBusinessService

  @OpenApiOperationPost({
    path: '/api/v1/job/incoming-wallet-processor',
    description: 'Schedule an event to move money from all incoming wallets to saving wallets',
    summary: 'Schedule an event to move money from all incoming wallets to saving wallets',
    security: [{ ConfigurationToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Event scheduled successfully' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    await this.receiveMoneyBusinessService.notifyReceiveForAll()

    return this.empty(StatusCode.Success)
  }
}
