2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './po'
export * from './so'

OpenApiPath({
  path: '/api/v3/order',
  tag: 'Order',
})
