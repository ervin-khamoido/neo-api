2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Yield order webhook input model',
})
export class YieldOrderWebhookInput {
  @OpenApiSchemaProperty({
    description: 'Transaction ID',
    writeOnly: true,
  })
  @readable
  transactionId!: string

  @OpenApiSchemaProperty({
    description: 'Transaction Status',
    writeOnly: true,
  })
  @readable
  transactionStatus!: string

  @OpenApiSchemaProperty({
    description: 'Debited account ID',
    writeOnly: true,
  })
  @readable
  from!: string

  @OpenApiSchemaProperty({
    description: 'Credited account ID',
    writeOnly: true,
  })
  @readable
  to!: string

  @OpenApiSchemaProperty({
    description: 'User UID',
    writeOnly: true,
  })
  @readable
  owner!: string

  @OpenApiSchemaProperty({
    description: 'Wallet UID',
    writeOnly: true,
  })
  @readable
  wallet!: string

  @OpenApiSchemaProperty({
    description: 'Amount',
    writeOnly: true,
  })
  @readable
  amount!: number

  @OpenApiSchemaProperty({
    description: 'Daily amount',
    writeOnly: true,
  })
  @readable([Object], true)
  dailyAmount!: object[] | null

  @OpenApiSchemaProperty({
    description: 'Date when yield transaction occured',
    writeOnly: true,
  })
  @readable
  effectiveDate!: Date

  @OpenApiSchemaProperty({
    description: 'Yield start date period',
    writeOnly: true,
  })
  @readable
  yieldStartDate!: Date

  @OpenApiSchemaProperty({
    description: 'Yield end date period',
    writeOnly: true,
  })
  @readable
  yieldEndDate!: Date

  @OpenApiSchemaProperty({
    description: 'Transaction created at date in MT',
    writeOnly: true,
  })
  @readable
  createdAt!: Date
}
