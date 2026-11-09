2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'User bank account output model',
})
export class UserBankAccountOutput {
  @OpenApiSchemaProperty({
    description: 'User Bank UID',
    readOnly: true,
  })
  @readable
  public uid!: string

  @OpenApiSchemaProperty({
    description: 'Bank UID',
    readOnly: true,
  })
  @readable
  public bank!: string

  @OpenApiSchemaProperty({
    description: 'Bank Name',
    readOnly: true,
  })
  @readable
  public bankName!: string

  @OpenApiSchemaProperty({
    description: 'User bank account number',
    readOnly: true,
  })
  @readable
  public bankAccountNumber!: string

  @OpenApiSchemaProperty({
    description: 'User bank account number (public)',
    readOnly: true,
  })
  @readable
  public bankAccountNumberPublic!: string

  @OpenApiSchemaProperty({
    description: 'Created at date',
    readOnly: true,
  })
  @readable
  public createdAt!: Date

  @OpenApiSchemaProperty({
    description: 'Last updated at date',
    readOnly: true,
  })
  @readable
  public updatedAt!: Date
}
