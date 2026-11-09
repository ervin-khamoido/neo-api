2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Calculate on-chain order input model',
})
export class CalculateOnChainOrderInput {
  @OpenApiSchemaProperty({
    description: 'Amount in USDC',
    writeOnly: true,
  })
  @readable(Number)
  amountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Base/Native Coin - avaxc, tavaxc, eth etc',
    writeOnly: true,
  })
  @readable(String)
  baseCoin!: string

  @OpenApiSchemaProperty({
    description: 'Coin - tavaxc:link, etc',
    writeOnly: true,
  })
  @readable(String)
  coin!: string

  @OpenApiSchemaProperty({
    description: 'Crypto address to send the funds to',
    writeOnly: true,
  })
  @readable(String)
  toAddress!: string
}
