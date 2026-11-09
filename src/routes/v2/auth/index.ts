2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './post-sign-up.route'

OpenApiPath({
  path: '/api/v2/auth',
  tag: 'Auth',
})
