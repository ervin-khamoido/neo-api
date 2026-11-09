2021

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { UserLevel } from '../db'

@OpenApiSchema({
  description: 'User level output model',
})
export class UserLevelOutput {
  @OpenApiSchemaProperty({
    description: 'User level code',
    type: 'string',
    enum: [UserLevel.Level0, UserLevel.Level1, UserLevel.Level2, UserLevel.Level3],
    readOnly: true,
  })
  @readable(String)
  code!: UserLevel

  @OpenApiSchemaProperty({
    description: 'User level name',
    type: 'string',
    readOnly: true,
  })
  @readable(String)
  name!: string
}
