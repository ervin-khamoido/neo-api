2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Create on-chain order input model',
})
export class OnChainOrderInput {
  @OpenApiSchemaProperty({
    description: 'Transaction ref from calculation route',
    writeOnly: true,
  })
  @readable
  txRef!: string
}
