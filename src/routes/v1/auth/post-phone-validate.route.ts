2021

import { inject, named } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { SimpleValidateOutput } from '../../../models/response'
import { IValidator, ValidatorSymbol } from '@ts-awesome/validate'
import { PhoneInput } from '../../../models/request'

@httpPost('/api/v1/auth/phone/validate')
export class PostPhoneValidateRoute extends Route {
  @inject(ValidatorSymbol) @named('phone') phoneValidator!: IValidator<string>

  @OpenApiOperationPost({
    path: '/api/v1/auth/phone/validate',
    description: 'Check if phone is valid',
    summary: 'POST. Check if phone is valid',
    security: [],
    request: {
      body: {
        required: true,
        schema: PhoneInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'The validation result', content: SimpleValidateOutput },
    },
  })
  public async handle(@requestBody(PhoneInput) body: PhoneInput): Promise<void> {
    const result = this.phoneValidator.validate(body.phone, { required: true })

    if (result === true) {
      return this.json({ valid: true }, SimpleValidateOutput)
    } else {
      return this.json({ valid: false, errors: result }, SimpleValidateOutput)
    }
  }
}
