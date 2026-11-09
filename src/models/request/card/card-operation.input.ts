2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Card operation (fund/unload) input model',
})
export class CardOperationInput {
  @OpenApiSchemaProperty({
    description: 'The amount to fund/unload the card',
    writeOnly: true,
  })
  @readable(Number)
  amount!: number
}
