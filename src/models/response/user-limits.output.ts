2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'User limits output model',
})
export class UserLimitsOutput {
  @OpenApiSchemaProperty({
    description: 'Max Available Limit (Buy)',
    readOnly: true,
  })
  @readable
  maxAvailableLimit!: number

  @OpenApiSchemaProperty({
    description: 'Max Available Limit (Sell)',
    readOnly: true,
  })
  @readable
  maxAvailableSellLimit!: number
}
