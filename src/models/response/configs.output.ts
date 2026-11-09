2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Application configs output model',
})
export class AppConfigsOutput {
  @OpenApiSchemaProperty({
    description: 'Delay in seconds to transition from the dummy screen in the buy flow',
    readOnly: true,
  })
  @readable
  public buyDummyDelay!: number

  @OpenApiSchemaProperty({
    description: 'Delay in seconds to transition from the dummy screen in the sell flow',
    readOnly: true,
  })
  @readable
  public sellDummyDelay!: number
}
