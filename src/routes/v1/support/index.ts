2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './get-help-center.route'
export * from './post-contact-support.route'
export * from './get-me-freshchat.route'
export * from './post-me-freshchat.route'

OpenApiPath({
  path: '/api/v1/support',
  tag: 'Support',
})
