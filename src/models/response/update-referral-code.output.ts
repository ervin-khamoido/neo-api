2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { CustomErrorOutput } from './custom-error.output'

@OpenApiSchema({
  description: 'Update user referral code output model',
})
export class UpdateReferralCodeOutput {
  @OpenApiSchemaProperty({
    description:
      'True if the referral code was sucessfully updated, otherwise false and the errors property will contain more details',
    readOnly: true,
  })
  @readable
  success!: boolean

  @OpenApiSchemaProperty({
    description: `The error that occurred while trying to update the referral code`,
    readOnly: true,
  })
  @readable(CustomErrorOutput, true)
  error?: CustomErrorOutput | null
}
