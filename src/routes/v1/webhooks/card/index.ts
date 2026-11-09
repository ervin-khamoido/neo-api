2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './post-card-event.webhook.route'

// NOTE: The 'direct-webhook' part of the path is intentional.
// It varies from our other webhook routes to avoid the WebhookAccessMiddleware picking up and trying to authenticate the requests.
// Bridgecard has it's own middleware because we cannot configure headers in BridgeCard so we cannot
// send the webhooks through the proxy service like we do with our other webhooks.

OpenApiPath({
  path: '/api/v1/direct-webhook/bridgecard',
  tag: 'Card Webhooks',
  security: [{ BridgeCardToken: [] }],
})
