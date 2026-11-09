2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { email, presence, validate } from '@ts-awesome/validate'

@OpenApiSchema({
  description: 'Email input model',
})
export class EmailInput {
  @OpenApiSchemaProperty({
    description: "User's email",
    writeOnly: true,
  })
  @validate([presence(), email()])
  @readable
  email!: string
}
