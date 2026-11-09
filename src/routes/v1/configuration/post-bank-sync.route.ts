2021

import { inject } from 'inversify'

import { httpPost, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { ConfigurationAccessMiddleware } from '../../../middleware/access/configuration-access.middleware'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import {
  BankManagementServiceSymbol,
  IBankManagementService,
} from '../../../services/dumb/bank/bank-management.service'
import { BankSyncOutput } from '../../../models/response/bank-sync.output'

@httpPost('/api/v1/configuration/bank/sync', ConfigurationAccessMiddleware)
export class PostBankSyncRoute extends Route {
  @inject(BankManagementServiceSymbol) bankManagementService!: IBankManagementService
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @OpenApiOperationPost({
    path: '/api/v1/configuration/bank/sync',
    description: 'Sync banks dictionary with Paystack',
    summary: 'Sync banks with Paystack',
    security: [{ ConfigurationToken: [] }],

    responses: {
      [StatusCode.Accepted]: { description: 'Successfully synchronized liquidity provider', content: BankSyncOutput },
      [StatusCode.BadRequest]: { description: 'Liquidity provider model is incorrect' },
      [StatusCode.Forbidden]: { description: 'Forbidden to access this resource' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const result = await this.uow.auto(() => this.bankManagementService.syncBanks())

    return this.json(result, StatusCode.Accepted, BankSyncOutput)
  }
}
