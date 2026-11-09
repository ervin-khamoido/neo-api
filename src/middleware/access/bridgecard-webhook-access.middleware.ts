2023

import { inject, injectable } from 'inversify'
import utils from '../../lib/utils/helpers'
import AES256 from 'aes-everywhere'
import _ from 'lodash'

import { IHttpRequest, IMiddleware } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { BridgeCardConfigSymbol, IBridgeCardConfig } from '../../models/config'

import { UnauthorizedError } from '../../errors'

export const FORWARDED_FOR_TOKEN_HEADER_NAME = 'X-Forwarded-For'
export const WEBHOOK_SIGNATURE_TOKEN_HEADER_NAME = 'X-Webhook-Signature'

@injectable()
export class BridgeCardWebhookAccessMiddleware implements IMiddleware {
  @inject(LoggerFactorySymbol) loggerFactory!: ILoggerFactory
  @inject(BridgeCardConfigSymbol) bridgeCardConfig!: IBridgeCardConfig

  public async handle(req: IHttpRequest): Promise<void> {
    const logger = this.loggerFactory(BridgeCardWebhookAccessMiddleware)
    const requesterIp = utils.getRequesterIP(req)

    // Log access attempt
    logger.info(`Requested access to bridgecard webhooks API from ${requesterIp}`)

    const forwardedForKey = req.headers[FORWARDED_FOR_TOKEN_HEADER_NAME.toLowerCase()]
    if (!forwardedForKey) {
      logger.warn(`BridgeCard webhook request missing forwarded for token. Access denied to ${requesterIp}`)

      throw new UnauthorizedError()
    }

    const webhookSignature = req.headers[WEBHOOK_SIGNATURE_TOKEN_HEADER_NAME.toLowerCase()]
    if (!webhookSignature || !_.isString(webhookSignature)) {
      logger.warn(`BridgeCard webhook request missing signature. Access denied to ${requesterIp}`)

      throw new UnauthorizedError()
    }

    // The decrypted value should match our bridgecard webhook secret key
    const decryptedSignature = await this.decryptWebhookSignature(webhookSignature)
    if (decryptedSignature !== this.bridgeCardConfig.apiWebhookSecretKey) {
      logger.warn(`BridgeCard webhook request webhook secret key did not match. Access denied to ${requesterIp}`)

      throw new UnauthorizedError()
    }

    // if (forwardedForKey !== this.bridgeCardConfig.apiForwardedForKey) {
    //   logger.warn(`BridgeCard webhook request forwarded for token did not match. Access denied to ${requesterIp}`)
    //
    //   throw new UnauthorizedError()
    // }

    logger.info(`BridgeCard webhook access granted to ${requesterIp}`)
  }

  private async decryptWebhookSignature(webhookSignature: string): Promise<string> {
    const logger = this.loggerFactory(BridgeCardWebhookAccessMiddleware)

    try {
      return AES256.decrypt(webhookSignature, this.bridgeCardConfig.apiSecretKey)
    } catch (err: any) {
      logger.error(err)
      logger.warn(`Failed to decrypt BridgeCard webhook signature`)

      throw new UnauthorizedError()
    }
  }
}
