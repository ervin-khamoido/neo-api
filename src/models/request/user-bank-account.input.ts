2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'User bank account input model',
})
export class UserBankAccountInput {
  @OpenApiSchemaProperty({
    description: 'Bank UID',
    writeOnly: true,
  })
  @readable(String, true)
  bank!: string

  @OpenApiSchemaProperty({
    description: 'Bank account number',
    writeOnly: true,
  })
  @readable(String, true)
  bankAccountNumber!: string

  @OpenApiSchemaProperty({
    description: 'User name',
    writeOnly: true,
  })
  @readable(String, true)
  userName?: string | null
}
