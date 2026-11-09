2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'
import { presence, validate } from '@ts-awesome/validate'

@OpenApiSchema({
  description: `User's Freshchat input model`,
})
export class UserFreshchatInput {
  @OpenApiSchemaProperty({
    description: `User's restore ID provided by Freshchat`,
    writeOnly: true,
  })
  @validate([presence()])
  @readable
  restoreId!: string
}
