2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { length, presence, validate, inclusion, alphaNumeric } from '@ts-awesome/validate'

import { Countries, Country } from '../db'

// the previous version of the App sends 'Nigeria' instead ISO 3166-1 alpha-2 codes of the country.
// the new app will send the ISO codes
// for backward compatability we have to handle 'Nigeria' as well
// the further remap happens in the "/api/v2/auth/signup" route
export const CountryEnumValues = [...Countries, 'Nigeria']

@OpenApiSchema({
  description: 'Address Input Model',
})
export class AddressInput {
  @OpenApiSchemaProperty({
    description: 'Main street address',
    writeOnly: true,
  })
  @validate([presence(), length({ minimum: 1 })])
  @readable
  addressLine!: string

  @OpenApiSchemaProperty({
    description: 'City',
    writeOnly: true,
  })
  @validate([presence(), alphaNumeric({ allowSpaces: true }), length({ minimum: 1 })])
  @readable
  city!: string

  @OpenApiSchemaProperty({
    description: 'State',
    writeOnly: true,
  })
  @validate([presence(), alphaNumeric({ allowSpaces: true }), length({ minimum: 1 })])
  @readable
  state!: string

  @OpenApiSchemaProperty({
    description: 'Country',
    enum: Countries,
    writeOnly: true,
  })
  @validate([presence(), inclusion(CountryEnumValues)])
  @readable
  country!: Country

  @OpenApiSchemaProperty({
    description: 'Postal Code',
    writeOnly: true,
  })
  @validate([alphaNumeric({ allowSpaces: false })])
  @readable(String, true)
  postalCode?: string | null

  @OpenApiSchemaProperty({
    description: 'Additional information about the address',
    writeOnly: true,
  })
  @validate([alphaNumeric({ allowSpaces: true })])
  @readable(String, true)
  comment?: string | null
}
