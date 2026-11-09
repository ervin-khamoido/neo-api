2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Pin token',
})
export class PinTokenRefreshOutput {
  @OpenApiSchemaProperty({
    description: 'Pin token',
    readOnly: true,
  })
  @readable
  token!: string
}
