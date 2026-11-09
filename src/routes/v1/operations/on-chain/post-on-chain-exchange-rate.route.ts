2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { UnitOfWorkSymbol, IUnitOfWork } from '@ts-awesome/entity'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import { OnChainExchangeRateInput } from '../../../../models/request'
import { OperationsAudience } from '../../../../models/config'

import { OperationsAccessMiddlewareFactory } from '../../../../middleware/access/operations-access.middleware'

import {
  IOnChainExchangeRateService,
  OnChainExchangeRateServiceSymbol,
} from '../../../../services/dumb/on-chain/on-chain-exchange-rate.service'
import { IOnChainService, OnChainServiceSymbol } from '../../../../services/dumb/on-chain/on-chain.service'

@httpPost(
  '/api/v1/operations/onchain/exchange-rate',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }),
)
export class PostOnChainExchangeRateRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(OnChainExchangeRateServiceSymbol) onChainExchangeRateService!: IOnChainExchangeRateService
  @inject(OnChainServiceSymbol) onChainService!: IOnChainService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostOnChainExchangeRateRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/operations/onchain/exchange-rate',
    description: `Add a new exchange rate for on-chain transactions`,
    summary: `POST Add a new exchange rate for on-chain transactions`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: OnChainExchangeRateInput,
      },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'The exchange rate was added successfully' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(OnChainExchangeRateInput) body: OnChainExchangeRateInput): Promise<void> {
    // Verify some things before adding the exchange rate
    await this.onChainService.verifyIsCoinSupported(body.token)
    await this.onChainExchangeRateService.verifyExchangeRateAmount(body.exchangeRate)

    try {
      await this.uow.auto(() => this.onChainExchangeRateService.addExchangeRate(body))
    } catch (err: any) {
      this.logger.error(`Failed to add new exchange rate for on-chain transactions for token ${body.token}`)
      this.logger.error(err)

      throw new BadRequestError(err.message)
    }

    return this.empty(StatusCode.NoContent)
  }
}
