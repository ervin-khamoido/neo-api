2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('order_configuration')
export class OrderConfigurationModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ name: 'max_opened_purchase_orders_allowed', nullable: true, model: Number })
  maxOpenedPurchaseOrdersAllowed!: number | null

  @dbField({ name: 'max_opened_sell_orders_allowed', nullable: true, model: Number })
  maxOpenedSellOrdersAllowed!: number | null

  @dbField({ name: 'max_opened_orders_allowed', nullable: true, model: Number })
  maxOpenedOrdersAllowed!: number | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const OrderConfigurationEntityServiceSymbol = Symbols.serviceFor(OrderConfigurationModel)

export interface IOrderConfigurationEntityService
  extends IEntityService<OrderConfigurationModel, 'id', 'id' | 'createdAt' | 'updatedAt', never> {}
