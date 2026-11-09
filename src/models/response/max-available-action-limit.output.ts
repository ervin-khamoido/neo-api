2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { UserActionType } from '../limits'

export const UserActionTypes = Object.values(UserActionType)

@OpenApiSchema({
  description: 'Max limit output model',
})
export class MaxAvailableActionLimitOutput {
  @OpenApiSchemaProperty({
    description: 'Action type (po, so, etc)',
    enum: UserActionTypes,
    readOnly: true,
  })
  @readable
  actionType!: UserActionType

  @OpenApiSchemaProperty({
    description: 'Max limit available to the user',
    readOnly: true,
  })
  @readable
  maxLimit!: number

  @OpenApiSchemaProperty({
    description: 'Key to identify which limit was used',
    readOnly: true,
  })
  @readable(String, true)
  reason?: string | null

  @OpenApiSchemaProperty({
    description: 'Policy',
    readOnly: true,
  })
  @readable(String, true)
  policy?: string | null

  @OpenApiSchemaProperty({
    description: 'Current timestamp',
    readOnly: true,
  })
  @readable
  timestamp!: Date
}
