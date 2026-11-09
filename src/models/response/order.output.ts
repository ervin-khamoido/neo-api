2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { OrderType } from '../db'

@OpenApiSchema({ description: 'Order output model' })
export class OrderOutput {
  @OpenApiSchemaProperty({
    description: 'Order uid',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  uid!: string

  @OpenApiSchemaProperty({
    description: 'Order order type',
    enum: [OrderType.PurchaseOrder, OrderType.SellOrder, OrderType.YieldOrder],
    readOnly: true,
  })
  @readable
  orderType!: OrderType

  @OpenApiSchemaProperty({
    description: 'Order reference number',
    readOnly: true,
  })
  @readable
  referenceNumber!: string

  @OpenApiSchemaProperty({
    description: 'Created at date',
    readOnly: true,
  })
  @readable
  createdAt!: Date

  @OpenApiSchemaProperty({
    description: 'Last updated at date',
    readOnly: true,
  })
  @readable
  updatedAt!: Date
}
