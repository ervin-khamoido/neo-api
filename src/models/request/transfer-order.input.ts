2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Transfer order input model',
})
export class TransferOrderInput {
  @OpenApiSchemaProperty({
    description: 'UID of the user receiving funds',
    writeOnly: true,
  })
  @readable(String)
  receiver!: string

  @OpenApiSchemaProperty({
    description: 'Amount in USDC',
    writeOnly: true,
  })
  @readable(Number)
  amountUsdc!: number
}
