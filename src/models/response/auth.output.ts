2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Auth info',
})
export class AuthOutput {
  @OpenApiSchemaProperty({
    description: 'If user does not exist, he gets registration token',
    format: 'uuid',
    readOnly: true,
  })
  @readable(String, true)
  token!: string | null

  @OpenApiSchemaProperty({
    description: 'User exists? yes/no',
    readOnly: true,
  })
  @readable
  exists!: boolean

  @OpenApiSchemaProperty({
    description: 'User verified email and phone? yes/no',
    readOnly: true,
  })
  @readable
  verified!: boolean
}
