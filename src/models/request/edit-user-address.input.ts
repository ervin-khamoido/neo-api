2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { AddressInput } from './address.input'

@OpenApiSchema({
  description: 'Edit User Address Input Model',
})
export class EditUserAddressInput {
  @OpenApiSchemaProperty({
    description: 'User UID',
    writeOnly: true,
  })
  @readable
  user!: string

  @OpenApiSchemaProperty({
    description: 'Address input',
    type: AddressInput,
    writeOnly: true,
  })
  @readable(AddressInput)
  address!: AddressInput

  @OpenApiSchemaProperty({
    description: `ID of the customer care agent that edited the user's address`,
    writeOnly: true,
  })
  @readable
  agentId!: string
}
