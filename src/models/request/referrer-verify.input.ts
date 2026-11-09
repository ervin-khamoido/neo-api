2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { alphaNumeric, length, presence, validate } from '@ts-awesome/validate'

@OpenApiSchema({
  description: 'Referrer Verify input model',
})
export class ReferrerVerifyInput {
  @OpenApiSchemaProperty({
    description: 'Referral Code',
    writeOnly: true,
  })
  @validate([presence(), length({ minimum: 2 }), alphaNumeric({ allowSpaces: false })])
  @readable
  referralCode!: string
}
