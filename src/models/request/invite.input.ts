2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { email, presence, validate } from '@ts-awesome/validate'

import { Validator } from '@ts-awesome/validate/dist/interfaces'

@OpenApiSchema({
  description: 'Invite user input model (email or phone)',
})
export class InviteInput {
  @OpenApiSchemaProperty({
    description: "User's email",
    type: 'string',
    nullable: true,
    writeOnly: true,
  })
  @validate([email()])
  @readable(String, true)
  email?: string | null

  @OpenApiSchemaProperty({
    description: "User's phone number",
    type: 'string',
    nullable: true,
    writeOnly: true,
  })
  @validate([phone()])
  @readable(String, true)
  phone?: string | null
}

export const PhoneRegex = /^(\+?\d{0,4})?\s?-?\s?(\(?\d{3}\)?)\s?-?\s?(\(?\d{3}\)?)\s?-?\s?(\(?\d{4}\)?)?$/i
function phone(): Validator {
  return value => (typeof value === 'string' && PhoneRegex.test(value) ? true : value ? 'Invalid phone number' : true)
}
