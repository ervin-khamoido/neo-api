2021

import { inject, injectable } from 'inversify'
import utils from '../../lib/utils/helpers'

import { IHttpRequest, IMiddleware } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { DashboardApiConfigSymbol, IDashboardApiConfig } from '../../models/config'

import { UnauthorizedError } from '../../errors'

export const TOKEN_HEADER_NAME = 'X-Dashboard-Token'

@injectable()
export class DashboardAccessMiddleware implements IMiddleware {
  @inject(LoggerFactorySymbol) loggerFactory!: ILoggerFactory
  @inject(DashboardApiConfigSymbol) dashboardConfig!: IDashboardApiConfig

  public async handle(req: IHttpRequest): Promise<void> {
    const logger = this.loggerFactory(DashboardAccessMiddleware)
    const requesterIp = utils.getRequesterIP(req)

    // Log access attempt
    logger.info(`Requested access to dashboard API from ${requesterIp}`)

    const dashboardApiKey = req.headers[TOKEN_HEADER_NAME.toLowerCase()]

    if (!dashboardApiKey) {
      throw new UnauthorizedError()
    }

    if (dashboardApiKey !== this.dashboardConfig.key) {
      throw new UnauthorizedError()
    }

    logger.info(`Dashboard API access granted to ${requesterIp}`)
  }
}
