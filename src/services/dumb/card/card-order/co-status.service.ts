2023

import { ILogger, LoggerFactorySymbol, ILoggerFactory } from '@ts-awesome/logger'

import { injectable, inject } from 'inversify'

import {
  CardOrderStatus,
  IOrderEntityService,
  IOrderStatusEntityService,
  OrderEntityServiceSymbol,
  OrderStatusEntityServiceSymbol,
  OrderStatusModel,
  OrderType,
} from '../../../../models/db'

import { ROStatusService } from '../../../ro-status.service'

export interface ICardOrderStatusService {
  created(orderId: number, changedBy: string): Promise<OrderStatusModel>
  pending(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
  completed(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
  failure(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
}

export const CardOrderStatusServiceSymbol = Symbol.for('ICardOrderStatusService')

@injectable()
export class CardOrderStatusService implements ICardOrderStatusService {
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(ROStatusService)
  }

  async created(orderId: number, changedBy: string): Promise<OrderStatusModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.CardOrder) {
      throw new Error('precondition failed: order does not exist or has an invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getOne({ orderId: orderId })
    if (currentStatus) {
      throw new Error('precondition failed: status must be undefined')
    }

    const result = await this.orderStatusEntityService.addOne({
      orderId: orderId,
      status: CardOrderStatus.Created,
      statusReason: '',
      changedBy: changedBy,
    })

    return result!
  }

  async pending(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.CardOrder) {
      throw new Error('precondition failed: order does not exist or has an invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case CardOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: CardOrderStatus.Pending,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case CardOrderStatus.Pending: {
        this.logger.warn('skipping update: reward order is already in a pending status')
        return null
      }
      default: {
        throw new Error(`precondition failed: reward order is in invalid state (${currentStatus.status})`)
      }
    }
  }

  async completed(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.CardOrder) {
      throw new Error('precondition failed: order does not exist or has an invalid type')
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error('precondition failed: status undefined')
    }

    switch (currentStatus.status) {
      case CardOrderStatus.Created:
      case CardOrderStatus.Pending: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: CardOrderStatus.Completed,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case CardOrderStatus.Completed: {
        this.logger.warn('skipping update: reward order is already in a completed status')
        return null
      }
      default:
        throw new Error(`precondition failed: reward order is in invalid state (${currentStatus.status})`)
    }
  }

  async failure(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.CardOrder) {
      throw new Error(`precondition failed: order ${orderId} does not exist or has an invalid type`)
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for order ${order.uid}`)
    }

    switch (currentStatus.status) {
      case CardOrderStatus.Created:
      case CardOrderStatus.Pending: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: CardOrderStatus.Failure,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case CardOrderStatus.Failure: {
        this.logger.warn(`skipping update: reward order ${order.uid} is already in a failed status`)
        return null
      }
      default:
        throw new Error(`precondition failed: reward order ${order.uid} is in invalid state (${currentStatus.status})`)
    }
  }
}
