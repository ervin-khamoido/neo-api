2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Per transaction limits output model',
})
export class PerTransactionLimitsOutput {
  @OpenApiSchemaProperty({
    description: 'Minimum buy amount usdc',
    readOnly: true,
  })
  @readable
  minBuyAmountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Maximum buy amount usdc',
    readOnly: true,
  })
  @readable
  maxBuyAmountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Minimum sell amount usdc',
    readOnly: true,
  })
  @readable
  minSellAmountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Maximum sell amount usdc',
    readOnly: true,
  })
  @readable
  maxSellAmountUsdc!: number
}
