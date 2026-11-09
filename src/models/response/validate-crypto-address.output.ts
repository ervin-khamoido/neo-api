2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Validate crypto address output model',
})
export class ValidateCryptoAddressOutput {
  @OpenApiSchemaProperty({
    description: 'True if valid, false otherwise',
    readOnly: true,
  })
  @readable
  isAddressValid!: boolean

  @OpenApiSchemaProperty({
    description: 'True if the address belongs to Neo Bank, false otherwise',
    readOnly: true,
  })
  @readable
  addressBelongsToNeoBank!: boolean

  @OpenApiSchemaProperty({
    description: 'Validation error message',
    readOnly: true,
  })
  @readable(String, true)
  addressValidationError?: string | null
}
