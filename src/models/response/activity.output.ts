2021

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import {
  IPurchaseOrderDetails,
  IRewardOrderDetails,
  ISellOrderDetails,
  ITransferOrderDetails,
  IYieldOrderDetails,
} from '../db'
import { ICardOrderDetails } from '../db/activity/co-activity-details'
import { IOnChainOrderDetails } from '../db/activity/oco-activity-details'

@OpenApiSchema({
  description: 'Activity status output model',
})
export class ActivityStatusOutput {
  @OpenApiSchemaProperty({
    description: 'Activity status',
    readOnly: true,
  })
  @readable
  status!: string

  @OpenApiSchemaProperty({
    description: 'Activity status reason',
    type: OpenApiDataType.string,
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  statusReason!: string | null

  @OpenApiSchemaProperty({
    description: 'Activity status datetime',
    readOnly: true,
  })
  @readable
  statusDatetime!: Date

  @OpenApiSchemaProperty({
    description: 'Last updated at date',
    readOnly: true,
  })
  @readable
  updatedAt!: Date

  @OpenApiSchemaProperty({
    description: 'Created at date',
    readOnly: true,
  })
  @readable
  createdAt!: Date
}

@OpenApiSchema({
  description: 'Activity output model',
})
export class ActivityOutput {
  @OpenApiSchemaProperty({
    description: 'Activity UID',
    readOnly: true,
  })
  @readable
  uid!: string

  @OpenApiSchemaProperty({
    description: 'Activity comment',
    type: OpenApiDataType.string,
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  comment?: string | null

  @OpenApiSchemaProperty({
    description: 'Activity type: Buy, Sell, Yield',
    readOnly: true,
  })
  @readable
  type!: string

  @OpenApiSchemaProperty({
    description: 'Order UID',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  order!: string

  @OpenApiSchemaProperty({
    description: 'Order reference number',
    readOnly: true,
  })
  @readable
  orderReferenceNumber!: string

  @OpenApiSchemaProperty({
    description: 'Order amount in USDC',
    readOnly: true,
  })
  @readable
  amountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Order amount in NGN',
    readOnly: true,
  })
  @readable
  amount!: number

  @OpenApiSchemaProperty({
    description: 'Activity details. The shape depends upon activity type',
    type: OpenApiDataType.object,
    readOnly: true,
  })
  @readable(Object)
  details!:
    | IPurchaseOrderDetails
    | ISellOrderDetails
    | IYieldOrderDetails
    | IRewardOrderDetails
    | ITransferOrderDetails
    | ICardOrderDetails
    | IOnChainOrderDetails

  @OpenApiSchemaProperty({
    description: 'Current activity status',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  status!: string | null

  @OpenApiSchemaProperty({
    description: 'Activity status history',
    type: ActivityStatusOutput,
    readOnly: true,
  })
  @readable([ActivityStatusOutput])
  statuses!: ActivityStatusOutput[]

  @OpenApiSchemaProperty({
    description: 'Last updated at date',
    readOnly: true,
  })
  @readable
  updatedAt!: Date

  @OpenApiSchemaProperty({
    description: 'Created at date',
    readOnly: true,
  })
  @readable
  createdAt!: Date
}
