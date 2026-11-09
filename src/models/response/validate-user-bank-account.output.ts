2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { ReasonCode, UserBankAccountValidationStatus } from '../../services/user-bank-account.service'

@OpenApiSchema({
  description: 'Validate user bank account output model',
})
export class ValidateUserBankAccountOutput {
  @OpenApiSchemaProperty({
    description: 'Validation status',
    readOnly: true,
  })
  @readable
  public status!: UserBankAccountValidationStatus

  @OpenApiSchemaProperty({
    description: 'Validation reason',
    readOnly: true,
  })
  @readable(String, true)
  reason?: string | null

  @OpenApiSchemaProperty({
    description: 'Validation reason code',
    type: 'string',
    enum: [ReasonCode.NoMatch],
    readOnly: true,
  })
  @readable(String, true)
  reasonCode?: ReasonCode | null

  @OpenApiSchemaProperty({
    description: 'Full BVN name',
    readOnly: true,
  })
  @readable(String, true)
  fullName?: string | null
}
