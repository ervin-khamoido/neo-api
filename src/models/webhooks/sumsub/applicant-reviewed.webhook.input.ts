2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { KYCProviderLevelName } from '../../db'
import { SumsubWebhookType } from './applicant-created.webhook.input'

//https://developers.sumsub.com/api-reference/#getting-verification-results
export const FINAL_REJECTION_LABELS = [
  'FORGERY',
  'DOCUMENT_TEMPLATE',
  'SPAM',
  'SELFIE_MISMATCH',
  'FOREIGNER',
  'DUPLICATE',
  'WRONG_USER_REGION',
  'BLACKLIST',
  'BLOCKLIST',
  'REGULATIONS_VIOLATIONS', // age/duplicate/wrong region/unsupported language
  'INCONSISTENT_PROFILE',
  'AGE_REQUIREMENT_MISMATCH',
  'EXPERIENCE_REQUIREMENT_MISMATCH',
  'CRIMINAL',
  'COMPROMISED_PERSONS',
  'PEP',
  'ADVERSE_MEDIA',
  'FRAUDULENT_PATTERNS',
  'SANCTIONS',
  'FRAUDULENT_LIVENESS',
]

// Technically 'BLACKLIST', 'PEP' and 'SANCTIONS' is also is part of the list below.
// But SumSub mistakenly marked some users as BLACKLIST, PEP or SANCTIONS.
// Therefor when they fixed the status on their end we were not able to unblock the users.
// The decision is to allow these statuses by default.
export const FINAL_REJECTION_LABELS_TO_HALT_RE_REVIEW = ['BLOCKLIST', 'CRIMINAL']

export enum ReviewAnswer {
  Green = 'GREEN',
  Red = 'RED',
}

export enum ReviewRejectType {
  Final = 'FINAL',
  Retry = 'RETRY',
}

// Type so that we can get the review result based on GREEN or RED result
export type ReviewResultInput = ReviewResultGreenInput | ReviewResultRedInput

@OpenApiSchema({
  description: 'Sumsub applicant reviewed webhook input model',
})
export class ReviewResultGreenInput {
  @OpenApiSchemaProperty({
    description: 'Review Answer - GREEN',
    writeOnly: true,
  })
  @readable
  reviewAnswer!: ReviewAnswer.Green
}

@OpenApiSchema({
  description: 'Sumsub applicant reviewed webhook input model',
})
export class ReviewResultRedInput {
  @OpenApiSchemaProperty({
    description: 'Review Answer - RED',
    writeOnly: true,
  })
  @readable
  reviewAnswer!: ReviewAnswer.Red

  @OpenApiSchemaProperty({
    description: 'Reject labels',
    writeOnly: true,
  })
  @readable([String])
  rejectLabels!: string[]

  @OpenApiSchemaProperty({
    description: 'Review reject type - FINAL or RETRY',
    writeOnly: true,
  })
  @readable
  reviewRejectType!: ReviewRejectType

  @OpenApiSchemaProperty({
    description: 'Human-readable comment that should not be shown to an end user, and is meant to be read by admins',
    writeOnly: true,
  })
  @readable
  clientComment!: string

  @OpenApiSchemaProperty({
    description: 'Human-readable comment that can be shown to your end user',
    writeOnly: true,
  })
  @readable(String)
  moderationComment?: string | null
}

@OpenApiSchema({
  description: 'Sumsub applicant reviewed webhook input model',
})
export class ApplicantReviewedWebhookInput {
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
    description: 'Review result',
    writeOnly: true,
  })
  @readable(Object)
  reviewResult!: ReviewResultInput

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
}
