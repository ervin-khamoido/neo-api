2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { CardStatus } from '../db'

const CardStatuses = Object.values(CardStatus)

@OpenApiSchema({
  description: 'User card status output model',
})
export class UserCardStatusOutput {
  @OpenApiSchemaProperty({
    description: 'User card status',
    type: 'string',
    enum: CardStatuses,
    readOnly: true,
  })
  @readable(String)
  status!: CardStatus
}
