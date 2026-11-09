2021

import { inject } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { BitGoWebhookServiceSymbol, IBitGoWebhookService } from '../../../../services/webhooks/bitgo.webhook.service'
import { TransferInput } from '../../../../models/request/bitgo/transfer.input'

@httpPost('/api/v1/wh/bitgo/transfer')
export class PostTransferWebhookRoute extends Route {
  @inject(BitGoWebhookServiceSymbol) bitgoWebhookService!: IBitGoWebhookService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostTransferWebhookRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/webhook/bitgo/transfer',
    description: "Triggers when there's a transfer into or out of a wallet.",
    summary: "Triggers when there's a transfer into or out of a wallet.",
    security: [{ WebhookToken: [] }],
    request: {
      body: {
        required: true,
        schema: TransferInput,
      },
    },
    responses: {
      [StatusCode.Accepted]: { description: 'Webhook call was resolved' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(TransferInput) body: TransferInput): Promise<void> {
    try {
      this.logger.info(`Received BitGo Transfer Webhook. Transfer ID: ${body.transfer} | Wallet ID: ${body.wallet}`)

      await this.bitgoWebhookService.onTransfer(body)
    } catch (err: any) {
      this.logger.error(err)
    }

    return this.empty(StatusCode.Accepted)
  }
}
