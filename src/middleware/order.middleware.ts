2021

import { inject, named } from 'inversify'

import { BadRequestError, IHttpRequest, IMiddleware, middleware, NotFoundError } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { SingleValidator } from '@ts-awesome/validate'
import { Symbols as ValidatorSymbols } from '@ts-awesome/validate/dist/symbols'

import { UID_PATTERN } from './common'
import { IOrderEntityService, OrderEntityServiceSymbol, OrderModel } from '../models/db'

export const CurrentOrderSymbol = Symbol.for('CurrentOrder')

@middleware(2, `/api/v*/order/:order(${UID_PATTERN})*`)
export class OrderMiddleware implements IMiddleware {
  @inject(LoggerFactorySymbol)
  private loggerFactory!: ILoggerFactory

  @inject(ValidatorSymbols.Validator)
  @named('uuid')
  uuidValidator!: SingleValidator<string>

  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService

  public async handle(req: IHttpRequest): Promise<void> {
    const { order: orderUid } = req.params
    const errors = this.uuidValidator.validate(orderUid, { required: true })
    if (Array.isArray(errors)) {
      throw new BadRequestError('Invalid order uid')
    }

    const order = await this.orderEntityService.getOne({ uid: orderUid })
    if (!order) {
      throw new NotFoundError(`Order not found`)
    }

    req.container?.rebind<OrderModel>(CurrentOrderSymbol).toConstantValue(order)
  }
}
