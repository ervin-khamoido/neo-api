2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'
import { WaitlistFeature } from '../../services/business/waitlist/waitlist.business.service'
import { presence, validate } from '@ts-awesome/validate'

@OpenApiSchema({
  description: 'User Waitlist Input',
})
export class UserWaitlistInput {
  @OpenApiSchemaProperty({
    description: 'Feature Name',
    writeOnly: true,
  })
  @validate([presence()])
  @readable
  feature!: WaitlistFeature
}
