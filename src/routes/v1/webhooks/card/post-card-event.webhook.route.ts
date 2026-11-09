2021

import { inject } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { CardEventWebhookInput } from '../../../../models/webhooks/bridgecard'

import { BridgeCardWebhookAccessMiddleware } from '../../../../middleware/access/bridgecard-webhook-access.middleware'

import {
  BridgeCardWebhookServiceSymbol,
  IBridgeCardWebhookService,
} from '../../../../services/webhooks/bridgecard.webhook.service'

@httpPost('/api/v1/direct-webhook/bridgecard/card', BridgeCardWebhookAccessMiddleware)
export class PostCardEventWebhookRoute extends Route {
  @inject(BridgeCardWebhookServiceSymbol) bridgeCardWebhookService!: IBridgeCardWebhookService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostCardEventWebhookRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/direct-webhook/bridgecard/card',
    description: 'POST handle card-related webhook events',
    summary: 'POST handle card-related webhook events',
    security: [{ BridgeCardForwardedForToken: [], BridgeCardWebhookSignatureToken: [] }],
    request: {
      path: {},
      body: {
        required: true,
        schema: CardEventWebhookInput,
      },
    },
    responses: {
      [StatusCode.OK]: { description: 'Webhook call was resolved' },
      [StatusCode.BadRequest]: { description: 'The weebhook was not processed successfully' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(CardEventWebhookInput) body: CardEventWebhookInput): Promise<void> {
    try {
      await this.bridgeCardWebhookService.processCardEvent(body)
    } catch (err: any) {
      this.logger.error(err, body)

      // make bridgecard know that the webhook was not successful
      // we receive have a nasty error `Error: Could not deserialize value.data.card_id. Value expected.`
      // uncomment when fixed^
      // return this.empty(StatusCode.BadRequest)
    }

    // bridgecard expects 200
    return this.empty(StatusCode.OK)
  }
}
