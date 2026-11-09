2021

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

export enum PhoneVerificationType {
  SMS = 'sms',
  WhatsApp = 'whatsapp',
}

@OpenApiSchema({
  description: 'Phone input',
})
export class PhoneInput {
  @OpenApiSchemaProperty({
    description: 'Phone number',
    writeOnly: true,
  })
  @readable
  phone!: string

  @OpenApiSchemaProperty({
    description: 'Verification Type',
    type: OpenApiDataType.string,
    nullable: true,
    enum: [PhoneVerificationType.SMS, PhoneVerificationType.WhatsApp],
    writeOnly: true,
  })
  @readable(String, true)
  type?: PhoneVerificationType
}
