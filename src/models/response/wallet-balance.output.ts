2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Wallet balance output model',
})
export class WalletBalanceOutput {
  @OpenApiSchemaProperty({
    description: 'Wallet balance',
    readOnly: true,
  })
  @readable
  public balance!: number

  @OpenApiSchemaProperty({
    description: 'Currency type',
    readOnly: true,
  })
  @readable
  public currency!: string
}
