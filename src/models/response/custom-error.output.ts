2021

import { readable } from '@ts-awesome/model-reader'
import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { CustomErrorType } from '../../errors'

@OpenApiSchema({
  description: 'Error output model',
})
export class CustomErrorOutput {
  @OpenApiSchemaProperty({
    description: 'Error type',
    readOnly: true,
  })
  @readable
  public type!: CustomErrorType

  @OpenApiSchemaProperty({
    description: 'Error code',
    readOnly: true,
  })
  @readable
  public code!: string

  @OpenApiSchemaProperty({
    description: 'Error message',
    readOnly: true,
  })
  @readable
  public message!: string
}
