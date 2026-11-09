2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { HOURS_TIME_FORMAT } from '../config'

// readonly after: string
// readonly showAt: string
// readonly showHours: number

@OpenApiSchema({
  description: 'Transaction translate info',
})
export class TransactionAvailabilityOutput {
  @OpenApiSchemaProperty({
    description: `Transaction translate is after the specified time in format: ${HOURS_TIME_FORMAT}`,
    readOnly: true,
  })
  @readable
  after!: string

  @OpenApiSchemaProperty({
    description: 'Show transaction translate message at',
    readOnly: true,
  })
  @readable
  showAt!: string

  @OpenApiSchemaProperty({
    description: 'Show transaction translate message for specified hours',
    readOnly: true,
  })
  @readable
  showHours!: number
}
