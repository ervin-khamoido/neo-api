2023

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './po'
export * from './so'

OpenApiPath({
  path: '/api/v4/order',
  tag: 'Order',
})
