2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { WaitlistFeature } from '../../services/business/waitlist/waitlist.business.service'

@OpenApiSchema({
  description: 'Waitlist Item Output',
})
export class WaitlistOutput {
  @OpenApiSchemaProperty({
    description: 'Feature name',
    enum: Object.values(WaitlistFeature),
    readOnly: true,
  })
  @readable
  feature!: WaitlistFeature

  @OpenApiSchemaProperty({
    description: 'Is the feature enabled?',
    readOnly: true,
  })
  @readable
  enabled!: boolean
}
