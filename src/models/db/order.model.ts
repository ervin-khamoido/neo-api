2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum OrderType {
  PurchaseOrder = 'PO',
  SellOrder = 'SO',
  YieldOrder = 'YO',
  RewardOrder = 'RO',
  TransferOrder = 'TO',
  CardOrder = 'CO',
  OnChainOrder = 'OCO',
}

export enum POOrderStatus {}

@dbTable('order')
export class OrderModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ name: 'user_id' })
  userId!: number

  @dbField({ name: 'order_type' })
  orderType!: OrderType

  @dbField({ name: 'reference_number' })
  referenceNumber!: string

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const OrderEntityServiceSymbol = Symbols.serviceFor(OrderModel)

export interface IOrderEntityService
  extends IEntityService<OrderModel, 'id', 'id' | 'uid' | 'updatedAt' | 'createdAt', never> {}
