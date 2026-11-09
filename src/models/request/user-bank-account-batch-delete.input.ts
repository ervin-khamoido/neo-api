2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'User bank account batch delete input model',
})
export class UserBankAccountBatchDeleteInput {
  @OpenApiSchemaProperty({
    description: 'User Bank UIDs',
    writeOnly: true,
  })
  @readable([String], true)
  userBanks!: string[] | null
}
