2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Referrer Info Reward Details Output Model',
})
class ReferrerInfoRewardDetailsOutput {
  @OpenApiSchemaProperty({
    description: 'Tells whether a referral reward is active for the current user',
    type: 'boolean',
    readOnly: true,
  })
  @readable
  isActive!: boolean

  @OpenApiSchemaProperty({
    description: 'Short reward info which depends on level',
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  shortReferralRewardInfo!: string | null
}

@OpenApiSchema({
  description: 'Referrer Info Output Model',
})
export class ReferrerInfoOutput {
  @OpenApiSchemaProperty({
    description: 'Referral Code',
    readOnly: true,
  })
  @readable
  referralCode!: string

  @OpenApiSchemaProperty({
    description: 'Referral Link',
    readOnly: true,
  })
  @readable
  referralLink!: string

  @OpenApiSchemaProperty({
    description: 'Referral reward conditions and amount for the referrer',
    readOnly: true,
  })
  @readable
  referralConditions!: string

  @OpenApiSchemaProperty({
    description: 'The text which user copies to share in social media',
    readOnly: true,
  })
  @readable
  invitationText!: string

  @OpenApiSchemaProperty({
    description: '',
    readOnly: true,
  })
  @readable(ReferrerInfoRewardDetailsOutput)
  rewardDetails!: ReferrerInfoRewardDetailsOutput
}
