/*
{
  hash: '0x5537464700e90aaeaa5b450134f7898d25e6f6341b3cb483bef9dda7dc09d9a9',
  type: 'address_confirmation',
  walletId: '6408a740e8bb880007af3c8a0af25b57',
  address: '0x82ad2d11bf243a0138964f9b0377c0436cb5da16'
}

 */

2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'BitGo Address Confirmation input model',
})
export class AddressConfirmationInput {
  @OpenApiSchemaProperty({
    description: 'The on-chain transaction id',
    writeOnly: true,
  })
  @readable
  hash!: string

  @OpenApiSchemaProperty({
    description: 'Event type to listen to. In this case "address_confirmation"',
    writeOnly: true,
  })
  @readable
  type!: 'address_confirmation'

  @OpenApiSchemaProperty({
    description: 'Wallet ID',
    writeOnly: true,
  })
  @readable
  walletId!: string

  @OpenApiSchemaProperty({
    description: 'The on-chain address',
    writeOnly: true,
  })
  @readable
  address!: string
}
