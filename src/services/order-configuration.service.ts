2021

import { inject, injectable } from 'inversify'
import { desc } from '@ts-awesome/orm'

import { getTime } from 'date-fns'

import { cache, CacheKey } from '../utils/cache-util'

import {
  IOrderConfigurationEntityService,
  OrderConfigurationEntityServiceSymbol,
  OrderConfigurationModel,
  OrderType,
} from '../models/db'

export interface IOrderConfigurationService {
  getOrderConfigurations(): Promise<OrderConfigurationModel | null>
  generateOrderReferenceNumber(orderType: OrderType): Promise<string>
}

export const OrderConfigurationServiceSymbol = Symbol.for('IOrderConfigurationService')

@injectable()
export class OrderConfigurationService implements IOrderConfigurationService {
  @inject(OrderConfigurationEntityServiceSymbol) orderConfigurationEntityService!: IOrderConfigurationEntityService

  @cache(CacheKey.OrderConfiguration)
  async getOrderConfigurations(): Promise<OrderConfigurationModel | null> {
    const orderConfiguration = await this.orderConfigurationEntityService
      .select()
      .orderBy(x => [desc(x.createdAt)])
      .fetchOne(OrderConfigurationModel)

    return orderConfiguration
  }

  async generateOrderReferenceNumber(orderType: OrderType): Promise<string> {
    const currentDate = new Date()

    let time = getTime(currentDate).toString()
    time = time.substring(time.length - 12)

    const referenceNumber = orderType.toLowerCase() + time.split('').reverse().join('')

    return referenceNumber
  }
}
