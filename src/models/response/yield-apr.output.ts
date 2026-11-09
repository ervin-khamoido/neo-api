2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Yield APR output model',
})
export class YieldAprOutput {
  @OpenApiSchemaProperty({
    description: 'APR effective date (2022-05-02T00:00:00.000Z)',
    readOnly: true,
  })
  @readable()
  effectiveDate!: Date

  @OpenApiSchemaProperty({
    description: 'APR value (% value divided by 100)',
    readOnly: true,
  })
  @readable
  apr!: number
}
