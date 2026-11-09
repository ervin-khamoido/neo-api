2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Referrer Verify output model',
})
export class ReferrerVerifyOutput {
  @OpenApiSchemaProperty({
    description: 'If the referral code is verified',
    writeOnly: true,
  })
  @readable
  verified!: boolean

  @OpenApiSchemaProperty({
    description: 'Formatted referral code',
    writeOnly: true,
  })
  @readable(String, true)
  referralCode!: string | null

  @OpenApiSchemaProperty({
    description: "Reason why it's not verified",
    writeOnly: true,
  })
  @readable(String, true)
  reason?: string | null
}
