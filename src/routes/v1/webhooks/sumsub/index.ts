2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './post-applicant-created.webhook.route'
export * from './post-applicant-pending.webhook.route'
export * from './post-applicant-reviewed.webhook.route'

OpenApiPath({
  path: '/api/v1/webhook/sumsub',
  tag: 'Sumsub Webhooks',
  security: [{ WebhookToken: [] }],
})
