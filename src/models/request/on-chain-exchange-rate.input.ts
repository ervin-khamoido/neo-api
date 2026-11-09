2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'On-Chain Exchange Rate Input',
})
export class OnChainExchangeRateInput {
  @OpenApiSchemaProperty({
    description: 'Exchange rate (ex: value would be $10.00 if 1 AVAX = $10 USD)',
    writeOnly: true,
  })
  @readable
  exchangeRate!: string

  @OpenApiSchemaProperty({
    description: 'Coin/token to convert from (ex: tavaxc:link or avaxc:usdc)',
    writeOnly: true,
  })
  @readable
  token!: string

  @OpenApiSchemaProperty({
    description: `ID of the agent that added this exchange rate`,
    writeOnly: true,
  })
  @readable
  agentId!: string
}
