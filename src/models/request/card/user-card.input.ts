2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'User card input model - information needed to issue a virtual card',
})
export class UserCardInput {
  @OpenApiSchemaProperty({
    description: 'Bank verification number (BVN)',
    writeOnly: true,
  })
  @readable(String)
  bvn!: string
}
