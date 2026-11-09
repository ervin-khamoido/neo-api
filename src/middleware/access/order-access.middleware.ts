2021

import { inject, injectable } from 'inversify'

import { ForbiddenError, IMiddleware, RequestError, StatusCode } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { CurrentOrderSymbol, CurrentUserSymbol } from '../../middleware'
import { OrderModel, UserModel } from '../../models/db'

@injectable()
export class OrderAccessMiddleware implements IMiddleware {
  @inject(LoggerFactorySymbol) loggerFactory!: ILoggerFactory
  @inject(CurrentUserSymbol) user!: UserModel
  @inject(CurrentOrderSymbol) order!: OrderModel

  public async handle(): Promise<void> {
    const logger = this.loggerFactory(OrderAccessMiddleware)

    if (!this.user || !this.order) {
      logger.error('critical: user or order is not defined')

      throw new RequestError('', 'PreconditionFailed', StatusCode.PreconditionFailed)
    }

    if (this.user.id !== this.order.userId) {
      logger.error(`critical: order does not belong to user`)

      throw new ForbiddenError()
    }
  }
}
