2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { FullNameInput } from './full-name.input'

@OpenApiSchema({
  description: 'Edit User Full Name Input Model',
})
export class EditUserFullNameInput {
  @OpenApiSchemaProperty({
    description: 'User UID',
    writeOnly: true,
  })
  @readable
  user!: string

  @OpenApiSchemaProperty({
    description: 'Full name input',
    type: FullNameInput,
    writeOnly: true,
  })
  @readable(FullNameInput)
  fullName!: FullNameInput

  @OpenApiSchemaProperty({
    description: `ID of the customer care agent that edited the user's full name`,
    writeOnly: true,
  })
  @readable
  agentId!: string
}
