2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { OrderOutput } from './order.output'

@OpenApiSchema({
  description: 'Sell order output model',
})
export class SellOrderOutput {
  @OpenApiSchemaProperty({
    description: 'Order basic info',
    type: OrderOutput,
    readOnly: true,
  })
  @readable(OrderOutput)
  order!: OrderOutput

  @OpenApiSchemaProperty({
    description: 'Includes fees',
    readOnly: true,
  })
  @readable
  includeFees!: boolean

  @OpenApiSchemaProperty({
    description: 'Amount in NGN',
    readOnly: true,
  })
  @readable
  amount!: number

  @OpenApiSchemaProperty({
    description: 'Amount in USDC entered by user',
    readOnly: true,
  })
  @readable
  amountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Sell order exchange rate',
    readOnly: true,
  })
  @readable
  exchangeRate!: number

  /**
   * @deprecated The property should not be used after app version 1.5.0 gets deprecated.
   */
  @OpenApiSchemaProperty({
    description: 'Neo Bank fee',
    readOnly: true,
    deprecated: true,
  })
  @readable(Number, true)
  fee!: number | null

  /**
   * @deprecated The property should not be used after app version 1.5.0 gets deprecated.
   */
  @OpenApiSchemaProperty({
    description: 'Agent fee',
    readOnly: true,
    deprecated: true,
  })
  @readable(Number, true)
  agentFee!: number | null

  @OpenApiSchemaProperty({
    description: 'Total fee',
    readOnly: true,
  })
  @readable
  feeTotal!: number

  @OpenApiSchemaProperty({
    description: 'Total NGN the user will receive',
    readOnly: true,
  })
  @readable
  total!: number

  @OpenApiSchemaProperty({
    description: 'Total USDC user should pay',
    readOnly: true,
  })
  @readable
  totalUsdc!: number

  @OpenApiSchemaProperty({
    description: 'User bank account UID',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  userBankAccount!: string

  @OpenApiSchemaProperty({
    description: 'Liquidity provider UID',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  liquidityProvider!: string

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
