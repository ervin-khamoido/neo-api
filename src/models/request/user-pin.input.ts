2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'User pin input model',
})
export class UserPinInput {
  @OpenApiSchemaProperty({
    description: 'User pin',
    writeOnly: true,
  })
  @readable(String, true)
  pin!: string
}
