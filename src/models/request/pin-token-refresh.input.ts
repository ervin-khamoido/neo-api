2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'
import { length, numericality, presence, validate } from '@ts-awesome/validate'

import { PIN_CODE_SIZE } from '../../services/pin-code.service'

@OpenApiSchema({
  description: 'Pin token refresh input model',
})
export class PinTokenRefreshInput {
  @OpenApiSchemaProperty({
    description: 'Pin code',
    writeOnly: true,
  })
  @validate([presence(), length({ is: PIN_CODE_SIZE }), numericality({ onlyInteger: true })])
  @readable
  pin!: string
}
