2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Fee output model',
})
export class FeeOutput {
  @OpenApiSchemaProperty({
    description: 'Company fee multiplier',
    readOnly: true,
  })
  @readable
  public companyFeeMultiplier!: number

  @OpenApiSchemaProperty({
    description: 'Agent fee amount',
    readOnly: true,
  })
  @readable
  public agentFeeAmountNgn!: number
}
