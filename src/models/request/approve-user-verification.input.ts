2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { KYCProviderLevelName } from '../db'

@OpenApiSchema({
  description: 'Approve User Verification Input Model',
})
export class ApproveUserVerificationInput {
  @OpenApiSchemaProperty({
    description: 'User UID',
    writeOnly: true,
  })
  @readable
  user!: string

  @OpenApiSchemaProperty({
    description: 'Provider Level name',
    writeOnly: true,
  })
  @readable
  providerLevelName!: KYCProviderLevelName

  @OpenApiSchemaProperty({
    description: `The reason for unblocking the user`,
    writeOnly: true,
  })
  @readable
  reason!: string

  @OpenApiSchemaProperty({
    description: `ID of the customer care agent that unblocked the user`,
    writeOnly: true,
  })
  @readable
  agentId!: string
}
