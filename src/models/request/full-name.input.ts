2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { presence, validate, format, length } from '@ts-awesome/validate'

import { MiddleNameRegex, NamePartRegex } from '../../common/constants'

@OpenApiSchema({
  description: 'Full Name Input Model',
})
export class FullNameInput {
  @OpenApiSchemaProperty({
    description: 'First Name',
    writeOnly: true,
  })
  @validate([presence(), format({ pattern: NamePartRegex }), length({ minimum: 1, maximum: 128 })])
  @readable
  firstName!: string

  @OpenApiSchemaProperty({
    description: 'Middle Name',
    type: 'string',
    nullable: true,
    writeOnly: true,
  })
  @validate([format({ pattern: MiddleNameRegex }), length({ maximum: 128 })])
  @readable(String, true)
  middleName?: string | null

  @OpenApiSchemaProperty({
    description: 'Last Name',
    writeOnly: true,
  })
  @validate([presence(), format({ pattern: NamePartRegex }), length({ minimum: 1, maximum: 128 })])
  @readable
  lastName!: string
}
