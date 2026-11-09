2021

import { ILogger, LoggerFactorySymbol, ILoggerFactory } from '@ts-awesome/logger'
import { inject, injectable } from 'inversify'

import {
  IOrderEntityService,
  IOrderStatusEntityService,
  OrderEntityServiceSymbol,
  OrderStatusEntityServiceSymbol,
  OrderStatusModel,
  OrderType,
  RewardOrderStatus,
} from '../models/db'

export interface IROStatusService {
  created(orderId: number, changedBy: string): Promise<OrderStatusModel>
  completed(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
  failed(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
}

export const ROStatusServiceSymbol = Symbol.for('IROStatusService')

@injectable()
export class ROStatusService implements IROStatusService {
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(ROStatusService)
  }

  async created(orderId: number, changedBy: string): Promise<OrderStatusModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.RewardOrder) {
      throw new Error('precondition failed: order does not exist or has an invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getOne({ orderId: orderId })
    if (currentStatus) {
      throw new Error('precondition failed: status must be undefined')
    }

    const result = await this.orderStatusEntityService.addOne({
      orderId: orderId,
      status: RewardOrderStatus.Created,
      statusReason: '',
      changedBy: changedBy,
    })

    return result!
  }

  async completed(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.RewardOrder) {
      throw new Error('precondition failed: order does not exist or has an invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case RewardOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: RewardOrderStatus.Completed,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case RewardOrderStatus.Completed: {
        this.logger.warn('skipping update: reward order is already in a completed status')
        return null
      }
      default:
        throw new Error(`precondition failed: reward order is in invalid state (${currentStatus.status})`)
    }
  }

  async failed(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.RewardOrder) {
      throw new Error(`precondition failed: order ${orderId} does not exist or has an invalid type`)
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for order ${order.uid}`)
    }

    switch (currentStatus.status) {
      case RewardOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: RewardOrderStatus.Failed,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case RewardOrderStatus.Failed: {
        this.logger.warn(`skipping update: reward order ${order.uid} is already in a failed status`)
        return null
      }
      default:
        throw new Error(`precondition failed: reward order ${order.uid} is in invalid state (${currentStatus.status})`)
    }
  }
}
