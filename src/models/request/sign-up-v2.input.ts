2021

/* eslint-disable filenames/match-regex */

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { date, format, length, presence, validate, inclusion, model } from '@ts-awesome/validate'

import { SimpleDate } from '../../lib/models/date'
import { Countries, Country } from '../db'
import { AddressInput, CountryEnumValues } from './address.input'

import { MiddleNameRegex, NamePartRegex } from '../../common/constants'

@OpenApiSchema({
  description: 'Sign up V2 Input Model',
})
export class SignUpV2Input {
  @OpenApiSchemaProperty({
    description: 'Referrer code',
    writeOnly: true,
  })
  // keep empty validation rules
  @validate([])
  @readable(String, true)
  referrerCode?: string | null

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

  @OpenApiSchemaProperty({
    description: 'Date of Birth',
    writeOnly: true,
  })
  @validate([presence(), date()])
  @readable
  dateOfBirth!: SimpleDate

  @OpenApiSchemaProperty({
    description: 'Country',
    enum: Countries,
    writeOnly: true,
  })
  @validate([presence(), inclusion(CountryEnumValues)])
  @readable
  country!: Country

  @OpenApiSchemaProperty({
    description: 'Address',
    type: AddressInput,
    nullable: true,
    writeOnly: true,
  })
  @validate([model(AddressInput)])
  @readable(AddressInput, true)
  address!: AddressInput | null

  @OpenApiSchemaProperty({
    description: 'Username',
    writeOnly: true,
  })
  @validate([presence()])
  @readable
  username!: string
}
