2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Simple validate output model',
})
export class SimpleValidateOutput {
  @OpenApiSchemaProperty({
    description: 'True if value is valid otherwise false and the errors property contains details',
    readOnly: true,
  })
  @readable
  valid!: boolean

  @OpenApiSchemaProperty({
    description: 'The list of errors if the value is invalid',
    readOnly: true,
  })
  @readable([String], true)
  errors?: string[]
}
