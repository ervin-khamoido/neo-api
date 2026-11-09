2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Blacklist Crypto Address Model',
})
export class BlacklistCryptoAddressInput {
  @OpenApiSchemaProperty({
    description: 'The crypto address to blacklist',
    writeOnly: true,
  })
  @readable
  address!: string

  @OpenApiSchemaProperty({
    description: 'The reason for adding it to the blacklist',
    writeOnly: true,
  })
  @readable
  reason!: string

  @OpenApiSchemaProperty({
    description: `ID of the customer care agent that added the address to the blacklist`,
    writeOnly: true,
  })
  @readable
  agentId!: string
}
