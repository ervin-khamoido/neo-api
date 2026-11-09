2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Bank output model',
})
export class BankOutput {
  @OpenApiSchemaProperty({
    description: 'Bank UID',
    readOnly: true,
  })
  @readable
  public uid!: string

  @OpenApiSchemaProperty({
    description: 'Bank name',
    readOnly: true,
  })
  @readable
  public name!: string
}
