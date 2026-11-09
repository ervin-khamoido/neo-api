2021

import { inject, injectable, interfaces } from 'inversify'
import utils from '../../lib/utils/helpers'

import { IHttpRequest, IMiddleware } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IOperationsApiConfig, OperationsApiConfigSymbol, OperationsAudience } from '../../models/config'
import { UnauthorizedError } from '../../errors'

export const TOKEN_HEADER_NAME: string = 'X-Operations-Token'

export interface IOperationsAccessMiddleware extends IMiddleware {
  loggerFactory: ILoggerFactory
  config: IOperationsApiConfig
}

export interface IOperationsAccessOptions {
  audience: OperationsAudience
}

export function OperationsAccessMiddlewareFactory(options: IOperationsAccessOptions): interfaces.Newable<IMiddleware> {
  @injectable()
  class _OperationsAccessMiddleware implements IOperationsAccessMiddleware {
    @inject(LoggerFactorySymbol) loggerFactory!: ILoggerFactory
    @inject(OperationsApiConfigSymbol) config!: IOperationsApiConfig

    public async handle(req: IHttpRequest): Promise<void> {
      const logger = this.loggerFactory(_OperationsAccessMiddleware)
      const requesterIp = utils.getRequesterIP(req)

      // log access attempt
      logger.info(`Requested access to operations from ${requesterIp} for audience ${options.audience}`)

      const operationsApiKey = req.headers[TOKEN_HEADER_NAME.toLowerCase()]
      if (!operationsApiKey) {
        logger.warn(
          `Operations access denied for ${requesterIp} for audience ${options.audience}. Reason: no operations token provided.`,
        )
        throw new UnauthorizedError()
      }

      const audienceKey = this.config.audienceKeys.find(k => k.audience === options.audience)?.key
      if (!audienceKey) {
        logger.warn(
          `Operations access for ${requesterIp} for audience ${options.audience}. Audience key is not defined.`,
        )
      }

      if (operationsApiKey !== audienceKey) {
        logger.warn(
          `Operations access denied for ${requesterIp} for audience ${
            options.audience
          }. Reason: wrong token (expected: ${audienceKey?.slice(0, 2)}***, received: ${operationsApiKey.slice(
            0,
            2,
          )}***).`,
        )
        throw new UnauthorizedError()
      }

      logger.info(`Operations access granted to ${requesterIp} for audience ${options.audience}`)
    }
  }

  return _OperationsAccessMiddleware
}
