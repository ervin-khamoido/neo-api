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
  TransferOrderStatus,
} from '../models/db'

export interface ITOStatusService {
  created(orderId: number, changedBy: string): Promise<OrderStatusModel>
  completed(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
  failed(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
}

export const TOStatusServiceSymbol = Symbol.for('ITOStatusService')

@injectable()
export class TOStatusService implements ITOStatusService {
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(TOStatusService)
  }

  async created(orderId: number, changedBy: string): Promise<OrderStatusModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.TransferOrder) {
      throw new Error(`precondition failed: transfer order [${orderId}] does not exist or has an invalid type`)
    }

    const currentStatus = await this.orderStatusEntityService.getOne({ orderId: orderId })
    if (currentStatus) {
      throw new Error(
        `precondition failed: status must be undefined for 'created' status. Transfer order: [${order.uid}]`,
      )
    }

    const result = await this.orderStatusEntityService.addOne({
      orderId: orderId,
      status: TransferOrderStatus.Created,
      statusReason: '',
      changedBy: changedBy,
    })

    return result!
  }

  async completed(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.TransferOrder) {
      throw new Error(`precondition failed: transfer order [${orderId}] does not exist or has an invalid type`)
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for order ${order.uid}`)
    }

    switch (currentStatus.status) {
      case TransferOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: TransferOrderStatus.Completed,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case TransferOrderStatus.Completed: {
        this.logger.warn('skipping update: transfer order is already in a completed status')
        return null
      }
      default:
        throw new Error(`precondition failed: transfer order is in invalid state (${currentStatus.status})`)
    }
  }

  async failed(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order || order.orderType !== OrderType.TransferOrder) {
      throw new Error(`precondition failed: transfer order [${orderId}] does not exist or has an invalid type`)
    }

    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for order ${order.uid}`)
    }

    switch (currentStatus.status) {
      case TransferOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: TransferOrderStatus.Failed,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case TransferOrderStatus.Failed: {
        this.logger.warn(`skipping update: transfer order ${order.uid} is already in a failed status`)
        return null
      }
      default:
        throw new Error(
          `precondition failed: transfer order ${order.uid} is in invalid state (${currentStatus.status})`,
        )
    }
  }
}
