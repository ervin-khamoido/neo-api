import { OpenApiPath } from '@ts-awesome/openapi'

export * from './post-user-push-subscribe.route'
export * from './post-user-push-unsubscribe.route'

OpenApiPath({
  path: '/api/v1/user/push',
  tag: 'User Push Notifications',
  security: [{ FireToken: [] }],
})
