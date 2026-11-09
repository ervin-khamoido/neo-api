2023

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { ActivityOutput } from './activity.output'

@OpenApiSchema({
  description: 'Activities list output model',
})
export class ActivityListOutput {
  @OpenApiSchemaProperty({
    description: 'Next cursor',
    readOnly: true,
  })
  @readable(Number, true)
  nextCursor!: number | null

  @OpenApiSchemaProperty({
    description: 'Page size',
    readOnly: true,
  })
  @readable
  pageSize!: number

  @OpenApiSchemaProperty({
    description: 'List of activities',
    type: OpenApiDataType.array,
    items: ActivityOutput,
    readOnly: true,
  })
  @readable([ActivityOutput])
  activities!: ActivityOutput[]
}
