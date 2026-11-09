2021

import { inject, injectable } from 'inversify'

import {
  IOrderEntityService,
  IOrderStatusEntityService,
  OrderEntityServiceSymbol,
  OrderStatusEntityServiceSymbol,
  OrderStatusModel,
  OrderType,
  YieldOrderStatus,
} from '../models/db'

export interface IYOStatusService {
  completed(orderId: number, changedBy: string): Promise<OrderStatusModel>
}

export const YOStatusServiceSymbol = Symbol.for('IYOStatusService')

@injectable()
export class YOStatusService implements IYOStatusService {
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService

  async completed(orderId: number, changedBy: string): Promise<OrderStatusModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.YieldOrder) {
      throw new Error('precondition failed: order does not exist or has an invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getOne({ orderId: orderId })
    if (currentStatus) {
      throw new Error('precondition failed: status must be undefined')
    }

    const result = await this.orderStatusEntityService.addOne({
      orderId: orderId,
      status: YieldOrderStatus.Completed,
      statusReason: '',
      changedBy: changedBy,
    })

    return result!
  }
}
