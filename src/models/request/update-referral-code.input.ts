2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { email, presence, validate } from '@ts-awesome/validate'
import { Validator } from '@ts-awesome/validate/dist/interfaces'
import { readable } from '@ts-awesome/model-reader'

import { REFERRAL_CODE_SIZE } from '../../services/referrals/user-referrer.service'

@OpenApiSchema({
  description: 'User referral code input model',
})
export class UpdateReferralCodeInput {
  @OpenApiSchemaProperty({
    description: "User's email",
    type: 'string',
    writeOnly: true,
  })
  @validate([presence(), email()])
  @readable(String)
  email!: string

  @OpenApiSchemaProperty({
    description: 'New user referral code',
    writeOnly: true,
  })
  @readable
  @validate([presence(), referralCode()])
  referralCode!: string
}

export const ReferralCodeRegex = new RegExp('^[A-Z0-9]{' + REFERRAL_CODE_SIZE + '}$')
function referralCode(): Validator {
  return value => (typeof value === 'string' && ReferralCodeRegex.test(value) ? true : 'Invalid referral code')
}
