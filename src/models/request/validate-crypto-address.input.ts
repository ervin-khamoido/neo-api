2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Validate crypto address input model',
})
export class ValidateCryptoAddressInput {
  @OpenApiSchemaProperty({
    description: 'Crypto address',
    writeOnly: true,
  })
  @readable(String)
  address!: string

  @OpenApiSchemaProperty({
    description: 'Base Coin - avaxc, tavaxc, eth, etc',
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
}
