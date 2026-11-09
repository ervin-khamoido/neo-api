2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Block User Input Model',
})
export class BlockUserInput {
  @OpenApiSchemaProperty({
    description: 'User UID',
    writeOnly: true,
  })
  @readable
  user!: string

  @OpenApiSchemaProperty({
    description: `The reason for blocking the user`,
    writeOnly: true,
  })
  @readable
  reason!: string

  @OpenApiSchemaProperty({
    description: `ID of the customer care agent that blocked the user`,
    writeOnly: true,
  })
  @readable
  agentId!: string
}
