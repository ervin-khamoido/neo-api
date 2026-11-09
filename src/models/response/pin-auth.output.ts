2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Pin auth output model',
})
export class PinAuthOutput {
  @OpenApiSchemaProperty({
    description: 'Token',
    readOnly: true,
  })
  @readable(String, true)
  token!: string | null
}
