2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Access token output',
})
export class AccessTokenOutput {
  @OpenApiSchemaProperty({
    description: 'Access token',
    readOnly: true,
  })
  @readable
  token!: string
}
