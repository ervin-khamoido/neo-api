2021

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { email, inclusion, length, presence, validate } from '@ts-awesome/validate'

@OpenApiSchema({
  description: 'Sign up input model',
})
export class EmailVerifyInput {
  @OpenApiSchemaProperty({
    description: 'User email',
    writeOnly: true,
  })
  @validate([presence(), email()])
  @readable
  email!: string

  @OpenApiSchemaProperty({
    description: 'User email verification code',
    writeOnly: true,
  })
  @validate([presence(), length({ is: 5 })])
  @readable
  code!: string
}
