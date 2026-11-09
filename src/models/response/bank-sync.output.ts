2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({ description: 'Bank Synchronization Result' })
export class BankSyncOutput {
  @OpenApiSchemaProperty({
    description: 'Number of added banks',
    readOnly: true,
  })
  @readable
  addedCount!: number

  @OpenApiSchemaProperty({
    description: 'Number of deleted banks',
    readOnly: true,
  })
  @readable
  deletedCount!: number
}
