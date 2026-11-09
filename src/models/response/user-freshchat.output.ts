2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: `User's Freshchat info output model`,
})
export class UserFreshchatOutput {
  @OpenApiSchemaProperty({
    description: `External ID: User's UID is used`,
    readOnly: true,
  })
  @readable
  externalId!: string

  @OpenApiSchemaProperty({
    description: `User's restore ID`,
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  restoreId?: string | null

  @OpenApiSchemaProperty({
    description: `User's first name`,
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  firstName?: string | null

  @OpenApiSchemaProperty({
    description: `User's last name`,
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  lastName?: string | null

  @OpenApiSchemaProperty({
    description: 'User referrer code',
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  email?: string | null

  @OpenApiSchemaProperty({
    description: 'User phone number',
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  phone?: string | null

  @OpenApiSchemaProperty({
    description: `User's meta is sent to Freshchat`,
    type: 'object',
    nullable: true,
    readOnly: true,
  })
  @readable(Object, true)
  meta?: Record<string, string | number | boolean>
}
