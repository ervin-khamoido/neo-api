2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'
import { inclusion, presence, validate } from '@ts-awesome/validate'

import { CurrencyType } from '../db'

const CurrencyTypes = Object.values(CurrencyType)

@OpenApiSchema({
  description: 'User default currency input model',
})
export class UserDefaultCurrencyInput {
  @OpenApiSchemaProperty({
    description: 'User default currency',
    writeOnly: true,
  })
  @readable
  @validate([presence(), inclusion(CurrencyTypes)])
  currency!: string
}
