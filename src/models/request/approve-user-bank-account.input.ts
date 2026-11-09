2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Approve User Bank Account Model',
})
export class ApproveUserBankAccountInput {
  @OpenApiSchemaProperty({
    description: 'Bank account match log ID',
    writeOnly: true,
  })
  @readable
  bankNameMatchLogId!: number

  @OpenApiSchemaProperty({
    description: `ID of the customer care agent that added the bank account for the user`,
    writeOnly: true,
  })
  @readable
  agentId!: string
}
