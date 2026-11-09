2021

import { inject } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'

import { YieldOrderWebhookInput } from '../../../models/webhooks'

import { IYieldOrderService, YieldOrderServiceSymbol } from '../../../services/yield-order.service'

@httpPost('/api/v1/webhook/yield-processor/order/yield')
export class YieldOrderWebhookRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(YieldOrderServiceSymbol) yieldOrderService!: IYieldOrderService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(YieldOrderWebhookRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/webhook/yield-processor/order/yield',
    description: 'Create yield order for webhook requests from Yield Processor',
    summary: 'Create yield order for webhook requests from Yield Processor',
    security: [{ WebhookToken: [] }],
    request: {
      path: {},
      body: {
        required: true,
        schema: YieldOrderWebhookInput,
      },
    },
    responses: {
      [StatusCode.Accepted]: { description: 'Webhook call was resolved' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(YieldOrderWebhookInput) body: YieldOrderWebhookInput): Promise<void> {
    try {
      this.logger.info(
        `Create yield order hook. User: ${body?.owner}`,
        `Wallet: ${body?.wallet}`,
        `Transaction: ${body?.transactionId}`,
        `Amount: ${body?.amount}`,
        `EffectiveDate: ${body?.effectiveDate}`,
      )

      await this.uow.auto(() => this.yieldOrderService.createYieldOrder(body))
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
    }

    // Return request was successful, all errors should be handled asynchronously
    return this.empty(StatusCode.Accepted)
  }
}
