2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'
import { alphaNumeric, length, presence, validate } from '@ts-awesome/validate'

@OpenApiSchema({
  description: 'User input',
})
export class UsernameInput {
  @OpenApiSchemaProperty({
    description: 'Username',
    writeOnly: true,
  })
  @readable
  username!: string
}
