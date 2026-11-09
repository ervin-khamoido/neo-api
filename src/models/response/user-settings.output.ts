2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { CurrencyType } from '../db'

@OpenApiSchema({
  description: 'User settings output model',
})
export class UserSettingsOutput {
  @OpenApiSchemaProperty({
    description: 'Is dark mode enabled?',
    readOnly: true,
  })
  @readable
  darkMode!: boolean

  @OpenApiSchemaProperty({
    description: "Default user's currency",
    type: 'string',
    enum: [CurrencyType.USD, CurrencyType.NGN],
    readOnly: true,
  })
  @readable
  defaultCurrency!: CurrencyType

  @OpenApiSchemaProperty({
    description: 'Is app lock enabled?',
    readOnly: true,
  })
  @readable
  enableAppLock!: boolean

  @OpenApiSchemaProperty({
    description: 'Created at date',
    readOnly: true,
  })
  @readable
  createdAt!: Date

  @OpenApiSchemaProperty({
    description: 'Last updated at date',
    readOnly: true,
  })
  @readable
  updatedAt!: Date
}
