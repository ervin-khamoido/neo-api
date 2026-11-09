2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Liquidity Provider input model',
})
export class LiquidityProviderInput {
  @OpenApiSchemaProperty({
    description: 'Name',
    writeOnly: true,
  })
  @readable(String)
  name!: string

  @OpenApiSchemaProperty({
    description: 'HelpDesk representative group id',
    writeOnly: true,
  })
  @readable(String)
  helpDeskRepresentativeGroupId!: string
}
