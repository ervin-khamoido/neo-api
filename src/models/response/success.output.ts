2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Success output model',
})
export class SuccessOutput {
  @OpenApiSchemaProperty({
    description: 'Action performed successfully',
    readOnly: true,
  })
  @readable
  public success!: true
}
