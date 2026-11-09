2021

import { inject } from 'inversify'
import utils from '../../lib/utils/helpers'

import { IHttpRequest, IMiddleware, middleware, UnauthorizedError } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ConfigSymbol } from '@ts-awesome/config'
import { IConfig } from 'config'

export const TOKEN_HEADER_NAME: string = 'X-Webhook-Token'

@middleware(6, `/api/v*/webhook/*`)
export class WebhookAccessMiddleware implements IMiddleware {
  @inject(ConfigSymbol) config!: IConfig
  @inject(LoggerFactorySymbol) loggerFactory!: ILoggerFactory

  public async handle(req: IHttpRequest): Promise<void> {
    const logger = this.loggerFactory(WebhookAccessMiddleware)
    const requesterIp = utils.getRequesterIP(req)
    const originalWebhookAccessToken = this.config.get<string>('webhookAccessToken')

    // log access attempt
    logger.info(`Requested access to webhooks from ${requesterIp}`)

    const webhookAccessToken = req.headers[TOKEN_HEADER_NAME.toLowerCase()]

    if (!webhookAccessToken) {
      logger.error(`critical: webhook token is not defined`)

      throw new UnauthorizedError()
    }

    if (webhookAccessToken !== originalWebhookAccessToken) {
      logger.error(`critical: webhook token is not valid`)

      throw new UnauthorizedError()
    }

    logger.info(`Webhook access granted to ${requesterIp}`)
  }
}
