2021

import { inject, injectable } from 'inversify'
import utils from '../../lib/utils/helpers'

import { IHttpRequest, IMiddleware, ForbiddenError } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IConfigurationApiConfig, ConfigurationApiConfigSymbol } from '../../models/config'
import { UnauthorizedError } from '../../errors'

export const TOKEN_HEADER_NAME: string = 'X-Configuration-Token'

@injectable()
export class ConfigurationAccessMiddleware implements IMiddleware {
  @inject(LoggerFactorySymbol) loggerFactory!: ILoggerFactory
  @inject(ConfigurationApiConfigSymbol) config!: IConfigurationApiConfig

  public async handle(req: IHttpRequest): Promise<void> {
    const logger = this.loggerFactory(ConfigurationAccessMiddleware)
    const requesterIp = utils.getRequesterIP(req)

    // log access attempt
    logger.info(`Requested access to configuration from ${requesterIp}`)

    const configurationApiKey = req.headers[TOKEN_HEADER_NAME.toLowerCase()]

    if (!this.config.allow) {
      throw new ForbiddenError()
    }

    if (!configurationApiKey) {
      throw new UnauthorizedError()
    }

    if (configurationApiKey !== this.config.key) {
      throw new UnauthorizedError()
    }

    logger.info(`Configuration access granted to ${requesterIp}`)
  }
}
