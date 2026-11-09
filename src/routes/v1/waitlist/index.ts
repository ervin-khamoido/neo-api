import { OpenApiPath } from '@ts-awesome/openapi'

export * from './get-waitlist.route'
export * from './post-waitlist.route'
export * from './post-waitlist-feature-enable.route'

OpenApiPath({
  path: '/api/v1/waitlist',
  tag: 'Waitlist',
  security: [{}],
})
