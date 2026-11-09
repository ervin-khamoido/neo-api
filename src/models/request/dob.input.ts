2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { date, presence, validate } from '@ts-awesome/validate'

import { SimpleDate } from '../../lib/models/date'

@OpenApiSchema({
  description: 'Date of birth Input Model',
})
export class DoBInput {
  @OpenApiSchemaProperty({
    description: 'Date of Birth',
    writeOnly: true,
  })
  @validate([presence(), date()])
  @readable
  dateOfBirth!: SimpleDate
}
