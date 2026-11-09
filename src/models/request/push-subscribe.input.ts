2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { inclusion, length, presence, validate } from '@ts-awesome/validate'
import { Platform } from '../db/user-push.model'

const Platforms = Object.values(Platform)

@OpenApiSchema({
  description: 'User Push Notifications Subscribe input model',
})
export class PushSubscribeInput {
  @OpenApiSchemaProperty({
    description: 'User platform',
    enum: Platforms,
    writeOnly: true,
  })
  @validate([presence(), inclusion(Platforms)])
  @readable
  platform!: Platform

  @OpenApiSchemaProperty({
    description: 'User device id',
    writeOnly: true,
  })
  @validate([presence(), length({ minimum: 2 })])
  @readable
  device!: string

  @OpenApiSchemaProperty({
    description: 'Push Notifications Token',
    writeOnly: true,
  })
  @validate([presence(), length({ minimum: 10 })])
  @readable
  token!: string
}
