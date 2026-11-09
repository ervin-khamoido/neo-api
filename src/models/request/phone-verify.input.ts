import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { length, presence, validate } from '@ts-awesome/validate'
import { PHONE_NUMBER_VERIFICATION_CODE_SIZE } from '../../routes/v1/auth/phone/post-phone.route'

@OpenApiSchema({
  description: 'Phone verify input model',
})
export class PhoneVerifyInput {
  @OpenApiSchemaProperty({
    description: 'User phone',
    writeOnly: true,
  })
  @readable
  phone!: string

  @OpenApiSchemaProperty({
    description: 'User phone verification code',
    writeOnly: true,
  })
  @validate([presence(), length({ is: PHONE_NUMBER_VERIFICATION_CODE_SIZE })])
  @readable
  code!: string
}
