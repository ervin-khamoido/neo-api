2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Incoming crypto address output model',
})
export class IncomingCryptoAddressOutput {
  @OpenApiSchemaProperty({
    type: 'string',
    nullable: true,
    description: "User's incoming crypto address. If the address is null then a user must wait",
    readOnly: true,
  })
  @readable(String, true)
  address?: string | null
}
