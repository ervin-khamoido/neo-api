2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './patch-user-referrer-code.route'
export * from './get-user-referrer-info.route'

OpenApiPath({
  path: '/api/v1/user/referrer',
  tag: 'User Referrer',
  security: [{ FireToken: [] }],
})
