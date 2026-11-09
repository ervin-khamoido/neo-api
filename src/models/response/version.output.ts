2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Version response description',
})
export class VersionOutput {
  @OpenApiSchemaProperty({
    description: 'Id',
    readOnly: true,
  })
  @readable
  public id!: number

  @OpenApiSchemaProperty({
    description: 'Name',
    readOnly: true,
  })
  @readable
  public name!: string

  @OpenApiSchemaProperty({
    description: 'Description',
    readOnly: true,
  })
  @readable
  public description!: string

  @OpenApiSchemaProperty({
    description: 'Version',
    readOnly: true,
  })
  @readable
  public version!: string
}
