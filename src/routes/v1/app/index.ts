2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './get-app-configs.route'

OpenApiPath({
  path: '/api/v1/app',
  tag: 'App',
})
