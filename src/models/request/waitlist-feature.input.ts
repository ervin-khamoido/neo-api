2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'
import { WaitlistFeature } from '../../services/business/waitlist/waitlist.business.service'
import { boolean, presence, uuid, validate } from '@ts-awesome/validate'

@OpenApiSchema({
  description: 'Waitlist Feature Input',
})
export class WaitlistFeatureInput {
  @OpenApiSchemaProperty({
    description: 'User UID',
    writeOnly: true,
  })
  @validate([presence(), uuid()])
  @readable
  user!: string

  @OpenApiSchemaProperty({
    description: 'Feature Name',
    writeOnly: true,
  })
  @validate([presence()])
  @readable
  feature!: WaitlistFeature

  @OpenApiSchemaProperty({
    description: 'Feature On/Off',
    writeOnly: true,
  })
  @validate([presence(), boolean()])
  @readable
  enable!: boolean
}
