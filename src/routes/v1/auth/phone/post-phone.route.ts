import { inject, named } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { IVerificationService, VerificationServiceSymbol } from '../../../../services/verification'
import { PhoneInput, PhoneVerificationType } from '../../../../models/request'
import { IValidator, ValidatorSymbol } from '@ts-awesome/validate'
import { ITestPhoneNumberEntityService, TestPhoneNumberEntityServiceSymbol } from '../../../../models/db'
import { IPhoneConfig, PhoneConfigSymbol } from '../../../../models/config'

export const PHONE_NUMBER_VERIFICATION_CODE_SIZE = 6

@httpPost('/api/v1/auth/phone')
export class PostPhoneRoute extends Route {
  @inject(ValidatorSymbol) @named('phone') phoneValidator!: IValidator<string>
  @inject(VerificationServiceSymbol) verificationService!: IVerificationService

  @inject(TestPhoneNumberEntityServiceSymbol) testPhoneNumberService!: ITestPhoneNumberEntityService
  @inject(PhoneConfigSymbol) phoneConfig!: IPhoneConfig

  @OpenApiOperationPost({
    path: '/api/v1/auth/phone',
    description: 'User submits the phone and system sends an OTP',
    summary: 'Submit phone for verification',
    security: [],
    request: {
      body: {
        required: true,
        description: "User's phone number",
        schema: PhoneInput,
      },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'The phone OTP is sent' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
    },
  })
  async handle(@requestBody(PhoneInput) body: PhoneInput): Promise<void> {
    const result = this.phoneValidator.validate(body.phone, { required: true })
    if (result !== true) {
      throw new BadRequestError(result.join('\n'))
    }

    const testPhoneExists = await this.testPhoneNumberService.exists({ phone: body.phone })
    if (testPhoneExists) {
      return this.empty(StatusCode.NoContent)
    }

    // route OTP traffic
    let sendWithWhatsapp = body.type === PhoneVerificationType.WhatsApp

    if (this.phoneConfig.phoneOtpAllToWhatsapp) {
      sendWithWhatsapp = true
    }

    await this.verificationService.sendBySMS(body.phone, PHONE_NUMBER_VERIFICATION_CODE_SIZE, sendWithWhatsapp)

    return this.empty(StatusCode.NoContent)
  }
}
