2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Add ambassadors input model',
})
export class AddAmbassadorsInput {
  @OpenApiSchemaProperty({
    description: 'Array of user emails to make ambassadors or to update ambassador level',
    writeOnly: true,
  })
  @readable([String], true)
  emails!: string[] | null

  @OpenApiSchemaProperty({
    description: 'New ambassador level ID',
    writeOnly: true,
  })
  @readable
  levelId!: number

  @OpenApiSchemaProperty({
    description: `ID of the customer care agent that created the ambassadors`,
    writeOnly: true,
  })
  @readable
  agentId!: string
}

@OpenApiSchema({
  description: 'Remove ambassadors input model',
})
export class RemoveAmbassadorsInput {
  @OpenApiSchemaProperty({
    description: 'Array of user emails to remove as ambassadors',
    writeOnly: true,
  })
  @readable([String], true)
  emails!: string[] | null

  @OpenApiSchemaProperty({
    description: `ID of the customer care agent that removed the ambassadors`,
    writeOnly: true,
  })
  @readable
  agentId!: string
}
