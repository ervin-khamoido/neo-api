2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Reissue Card Input',
})
export class ReissueCardInput {
  @OpenApiSchemaProperty({
    description: 'User UID',
    format: 'uuid',
    writeOnly: true,
  })
  @readable
  user!: string
}
