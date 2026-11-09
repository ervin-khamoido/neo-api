2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { ExchangeRateServiceSymbol, IExchangeRateService } from '../../services/exchange-rate.service'

import { ExchangeRateOutput } from '../../models/response'

import { FireAccessMiddleware } from '../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../middleware/access/pin-access.middleware'

@httpGet('/api/v1/exchange-rate', FireAccessMiddleware(), PinAccessMiddleware)
export class GetExchangeRateRoute extends Route {
  @inject(ExchangeRateServiceSymbol) exchangeRateEntityService!: IExchangeRateService

  @OpenApiOperationGet({
    path: '/api/v1/exchange-rate',
    description: 'Get exchange rate',
    summary: 'GET exchange rate',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Exchange rate', content: ExchangeRateOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const exchangeRate = await this.exchangeRateEntityService.getLatestExchangeRate()
    return this.json(exchangeRate, ExchangeRateOutput)
  }
}
