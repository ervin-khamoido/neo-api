2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Calculate order input model',
})
export class CalculatePurchaseOrderInput {
  @OpenApiSchemaProperty({
    description: 'Should we include fees in total',
    writeOnly: true,
  })
  @readable
  includeFees!: boolean

  @OpenApiSchemaProperty({
    description: 'Amount in NGN',
    writeOnly: true,
  })
  @readable
  amount!: number

  @OpenApiSchemaProperty({
    description: 'Amount in USDC',
    writeOnly: true,
  })
  @readable
  amountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Exchange rate',
    writeOnly: true,
  })
  @readable
  exchangeRate!: number
}

@OpenApiSchema({
  description: 'Calculate order input model',
})
export class CalculateSellOrderInput {
  @OpenApiSchemaProperty({
    description: 'Should we include fees in total',
    writeOnly: true,
  })
  @readable
  includeFees!: boolean

  @OpenApiSchemaProperty({
    description: 'Amount in NGN',
    writeOnly: true,
  })
  @readable
  amount!: number

  @OpenApiSchemaProperty({
    description: 'Amount in USDC',
    writeOnly: true,
  })
  @readable
  amountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Exchange rate',
    writeOnly: true,
  })
  @readable
  exchangeRate!: number
}
