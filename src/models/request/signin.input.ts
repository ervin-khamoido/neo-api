2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { email, length, presence, validate } from '@ts-awesome/validate'

@OpenApiSchema({
  description: 'Sign in input model',
})
export class SignInInput {
  @OpenApiSchemaProperty({
    description: 'User Email',
    writeOnly: true,
  })
  @validate([presence(), email()])
  @readable
  email!: string

  @OpenApiSchemaProperty({
    description: 'User password',
    writeOnly: true,
  })
  @validate([presence(), length({ minimum: 1 })])
  @readable
  password!: string
}
