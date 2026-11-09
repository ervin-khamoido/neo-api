2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Exchange rate output model',
})
export class ExchangeRateOutput {
  @OpenApiSchemaProperty({
    description: 'Buying exchange rate',
    readOnly: true,
  })
  @readable
  public buyExchangeRate!: number

  @OpenApiSchemaProperty({
    description: 'Selling exchange rate',
    readOnly: true,
  })
  @readable
  public sellExchangeRate!: number
}
