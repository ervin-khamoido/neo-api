2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Webhook freshdesk operation ticket resolve model',
})
export class FreshdeskOperationsResolveInput {
  @OpenApiSchemaProperty({
    description: 'Ticket Id',
    writeOnly: true,
  })
  @readable(String, true)
  id?: string | null

  @OpenApiSchemaProperty({
    description: 'Ticket Status',
    writeOnly: true,
  })
  @readable(String, true)
  status?: string | null
}
