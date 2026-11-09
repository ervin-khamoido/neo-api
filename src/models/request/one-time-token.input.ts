2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { inclusion, length, numericality, presence, validate } from '@ts-awesome/validate'

import { OneTimeAction } from '../../services/pin-code.service'

const Actions = Object.values(OneTimeAction)

@OpenApiSchema({
  description: 'Pin token refresh input model',
})
export class OneTimeTokenInput {
  @OpenApiSchemaProperty({
    description: 'Pin code',
    writeOnly: true,
  })
  @validate([presence(), length({ is: 4 }), numericality({ onlyInteger: true })])
  @readable
  pin!: string

  @OpenApiSchemaProperty({
    description: 'Pin code',
    enum: Actions,
    writeOnly: true,
  })
  @validate([presence(), inclusion(Actions)])
  @readable
  action!: OneTimeAction
}
