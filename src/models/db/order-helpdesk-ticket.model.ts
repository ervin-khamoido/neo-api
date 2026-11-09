2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('order_helpdesk_ticket')
export class OrderHelpdeskTicketModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ name: 'order_id' })
  orderId!: number

  @dbField({ name: 'ticket_type' })
  ticketType!: string

  @dbField({ name: 'ticket_id' })
  ticketId!: string

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const OrderHelpdeskTicketEntityServiceSymbol = Symbols.serviceFor(OrderHelpdeskTicketModel)

export interface IOrderHelpdeskTicketEntityService
  extends IEntityService<OrderHelpdeskTicketModel, 'id', 'id' | 'uid' | 'updatedAt' | 'createdAt', never> {}
