2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Verify output model',
})
export class CardIssueEligibilityOutput {
  @OpenApiSchemaProperty({
    description: 'If verified',
    writeOnly: true,
  })
  @readable
  result!: boolean

  @OpenApiSchemaProperty({
    description: "Reason why it's not verified",
    writeOnly: true,
  })
  @readable(String, true)
  reason?: string | null
}
