2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { length, presence, validate } from '@ts-awesome/validate'

@OpenApiSchema({
  description: 'User Push Notifications unsubscribe input model',
})
export class PushUnsubscribeInput {
  @OpenApiSchemaProperty({
    description: 'Push Notifications Token',
    writeOnly: true,
  })
  @validate([presence(), length({ minimum: 10 })])
  @readable
  token!: string
}
