2021

import { inject } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { BitGoWebhookServiceSymbol, IBitGoWebhookService } from '../../../../services/webhooks/bitgo.webhook.service'
import { AddressConfirmationInput } from '../../../../models/request/bitgo/address-confirmation.input'

@httpPost('/api/v1/wh/bitgo/address/confirmation')
export class PostAddressConfirmationWebhookRoute extends Route {
  @inject(BitGoWebhookServiceSymbol) bitgoWebhookService!: IBitGoWebhookService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostAddressConfirmationWebhookRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/webhook/bitgo/address/confirmation',
    description: 'Address confirmation webhooks will fire when an address has been initialized on the wallet',
    summary: 'Address confirmation webhooks will fire when an address has been initialized on the wallet',
    security: [{ WebhookToken: [] }],
    request: {
      body: {
        required: true,
        schema: AddressConfirmationInput,
      },
    },
    responses: {
      [StatusCode.Accepted]: { description: 'Webhook call was resolved' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(AddressConfirmationInput) body: AddressConfirmationInput): Promise<void> {
    try {
      this.logger.info(
        `Received BitGo Address Confirmation Webhook. Address: ${body.address} | Wallet ID: ${body.walletId}`,
      )

      await this.bitgoWebhookService.onAddressConfirmation(body)
    } catch (err: any) {
      this.logger.error(err)
    }

    return this.empty(StatusCode.Accepted)
  }
}
