2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './get-me.route'
export * from './get-user-status.route'
export * from './get-limits.route'

OpenApiPath({
  path: '/api/v2/user',
  tag: 'User',
  security: [{ BearerAuth: [] }],
})
