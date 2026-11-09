2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'
import { of } from '@ts-awesome/orm'

import { BankOutput } from '../../models/response'

import { FireAccessMiddleware } from '../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../middleware/access/pin-access.middleware'

import { BankServiceSymbol, IBankService } from '../../services/bank.service'

@httpGet('/api/v1/bank', FireAccessMiddleware(), PinAccessMiddleware)
export class GetBanksRoute extends Route {
  @inject(BankServiceSymbol) bankService!: IBankService

  @OpenApiOperationGet({
    path: '/api/v1/bank',
    description: 'Get banks',
    summary: 'GET banks',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Banks', content: [BankOutput] },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const banks = await this.bankService.getBanks()

    const banksOutput = await Promise.all(
      banks.map(
        async bank =>
          ({
            uid: bank.uid,
            name: bank.name,
          } as BankOutput),
      ),
    )

    return this.json(banksOutput ?? [], [BankOutput])
  }
}
