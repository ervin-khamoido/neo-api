2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './post-address-confirmation.webhook.route'
export * from './post-transfer.webhook.route'

OpenApiPath({
  path: '/api/v1/webhook/bitgo',
  tag: 'BitGo Webhooks',
  security: [{ WebhookToken: [] }],
})
