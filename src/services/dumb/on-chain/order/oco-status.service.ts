2021

import { ILogger, LoggerFactorySymbol, ILoggerFactory } from '@ts-awesome/logger'
import { inject, injectable } from 'inversify'

import {
  IOrderStatusEntityService,
  OnChainOrderStatus,
  OrderStatusEntityServiceSymbol,
  OrderStatusModel,
} from '../../../../models/db'

export interface IOCOStatusService {
  created(orderId: number, changedBy: string): Promise<OrderStatusModel>
  completed(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
  failure(orderId: number, changedBy: string): Promise<OrderStatusModel | null>
}

export const OCOStatusServiceSymbol = Symbol.for('IOCOStatusService')

@injectable()
export class OcoStatusService implements IOCOStatusService {
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(OcoStatusService)
  }

  async created(orderId: number, changedBy: string): Promise<OrderStatusModel> {
    const currentStatus = await this.orderStatusEntityService.getOne({ orderId: orderId })
    if (currentStatus) {
      throw new Error(
        `precondition failed: status must be undefined for 'created' status. Receive on chain order: [${orderId}]`,
      )
    }

    const result = await this.orderStatusEntityService.addOne({
      orderId: orderId,
      status: OnChainOrderStatus.Created,
      statusReason: '',
      changedBy: changedBy,
    })

    return result!
  }

  async completed(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for order ${orderId}`)
    }

    switch (currentStatus.status) {
      case OnChainOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: OnChainOrderStatus.Completed,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case OnChainOrderStatus.Completed: {
        this.logger.warn('skipping update: receive on chain order is already in a completed status')
        return null
      }
      default:
        throw new Error(`precondition failed: receive on chain order is in invalid state (${currentStatus.status})`)
    }
  }

  async failure(orderId: number, changedBy: string): Promise<OrderStatusModel | null> {
    const currentStatus = await this.orderStatusEntityService.getByOrderIdForUpdate(orderId)
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for order ${orderId}`)
    }

    switch (currentStatus.status) {
      case OnChainOrderStatus.Created: {
        const result = await this.orderStatusEntityService.updateOne({
          orderId: orderId,
          status: OnChainOrderStatus.Failure,
          statusReason: '',
          changedBy: changedBy,
        })

        return result!
      }
      case OnChainOrderStatus.Failure: {
        this.logger.warn(`skipping update: receive on chain order ${orderId} is already in a failed status`)
        return null
      }
      default:
        throw new Error(
          `precondition failed: receive on chain order ${orderId} is in invalid state (${currentStatus.status})`,
        )
    }
  }
}
