2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { KYCProviderLevelName } from '../../db'

export enum SumsubWebhookType {
  ApplicantCreated = 'applicantCreated',
  ApplicantPending = 'applicantPending',
  ApplicantReviewed = 'applicantReviewed',
}

@OpenApiSchema({
  description: 'Sumsub applicant created webhook input model',
})
export class ApplicantCreatedWebhookInput {
  @OpenApiSchemaProperty({
    description: 'Applicant ID',
    writeOnly: true,
  })
  @readable
  applicantId!: string

  @OpenApiSchemaProperty({
    description: 'Inspection ID',
    writeOnly: true,
  })
  @readable
  inspectionId!: string

  @OpenApiSchemaProperty({
    description: 'Correlation ID',
    writeOnly: true,
  })
  @readable
  correlationId!: string

  @OpenApiSchemaProperty({
    description: 'KYC provider level name',
    writeOnly: true,
  })
  @readable
  levelName!: KYCProviderLevelName

  @OpenApiSchemaProperty({
    description: 'User UID',
    writeOnly: true,
  })
  @readable
  externalUserId!: string

  @OpenApiSchemaProperty({
    description: 'Type of webhook',
    writeOnly: true,
  })
  @readable
  type!: SumsubWebhookType

  @OpenApiSchemaProperty({
    description: 'Sandbox mode',
    writeOnly: true,
  })
  @readable
  sandboxMode!: boolean

  @OpenApiSchemaProperty({
    description: 'Review status',
    writeOnly: true,
  })
  @readable
  reviewStatus!: string

  @OpenApiSchemaProperty({
    description: 'Created at date',
    writeOnly: true,
  })
  @readable
  createdAtMs!: Date

  @OpenApiSchemaProperty({
    description: 'Client ID',
    writeOnly: true,
  })
  @readable
  clientId!: string
}
