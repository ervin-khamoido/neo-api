2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Change user pin input model',
})
export class ChangeUserPinInput {
  @OpenApiSchemaProperty({
    description: 'New pin code',
    writeOnly: true,
  })
  @readable(String, true)
  pin!: string
}
