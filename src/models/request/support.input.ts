import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { length, presence, validate } from '@ts-awesome/validate'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Contact support input model',
})
export class SupportInput {
  @OpenApiSchemaProperty({
    description: 'Support issue',
    writeOnly: true,
  })
  @validate([presence(), length({ minimum: 3, maximum: 100 })])
  @readable
  issue!: string

  @OpenApiSchemaProperty({
    description: 'Issue description',
    writeOnly: true,
  })
  @validate([presence(), length({ minimum: 3, maximum: 500 })])
  @readable
  description!: string
}
