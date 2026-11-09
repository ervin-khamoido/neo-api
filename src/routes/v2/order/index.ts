2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './po'
export * from './so'

OpenApiPath({
  path: '/api/v2/order',
  tag: 'Order',
})

OpenApiPath({
  path: '/api/v2/calculate',
  tag: 'Calculation',
})
