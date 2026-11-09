2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'
import { length, presence, validate } from '@ts-awesome/validate'

@OpenApiSchema({
  description: 'Sign up input model',
})
export class SignUpInput {
  @OpenApiSchemaProperty({
    description: 'Referrer code',
    writeOnly: true,
  })
  @readable(String, true)
  referrerCode?: string | null
}
