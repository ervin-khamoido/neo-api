2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Can create order output model',
})
export class CanCreateOrderOutput {
  @OpenApiSchemaProperty({
    description: 'If the user can create an order',
    readOnly: true,
  })
  @readable
  canCreate!: boolean

  @OpenApiSchemaProperty({
    description: 'Reason they cannot create an order',
    readOnly: true,
  })
  @readable
  reason!: string
}
