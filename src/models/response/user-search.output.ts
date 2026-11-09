2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'User search output model',
})
export class UserSearchOutput {
  @OpenApiSchemaProperty({
    description: 'User UID',
    readOnly: true,
  })
  @readable
  uid!: string

  @OpenApiSchemaProperty({
    description: "User's display name",
    readOnly: true,
  })
  @readable(String)
  displayName!: string

  @OpenApiSchemaProperty({
    description: 'Username',
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  username?: string | null
}
