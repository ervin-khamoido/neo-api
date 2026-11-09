2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './put-freshdesk-operation-resolve.webhook.route'
export * from './post-yield-order.webhook.route'

export * from './sumsub'
export * from './card'
export * from './bitgo'

OpenApiPath({
  path: '/api/v1/webhook',
  tag: 'Webhooks',
  security: [{ WebhookToken: [] }],
})
