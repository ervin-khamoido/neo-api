2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Newly created entity uid',
})
export class PostEntityOutput {
  @OpenApiSchemaProperty({
    description: 'Entity UID',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  uid!: string
}
