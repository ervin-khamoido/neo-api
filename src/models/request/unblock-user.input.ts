2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Unblock User Input Model',
})
export class UnblockUserInput {
  @OpenApiSchemaProperty({
    description: 'User UID',
    writeOnly: true,
  })
  @readable
  user!: string

  @OpenApiSchemaProperty({
    description: `The reason for unblocking the user`,
    writeOnly: true,
  })
  @readable
  reason!: string

  @OpenApiSchemaProperty({
    description: `ID of the customer care agent that unblocked the user`,
    writeOnly: true,
  })
  @readable
  agentId!: string
}
