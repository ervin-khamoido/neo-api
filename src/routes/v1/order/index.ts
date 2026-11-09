2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './get-order-activity.route'
export * from './get-per-transaction-limits.route'

export * from './po'
export * from './so'
export * from './to'
export * from './oco'

OpenApiPath({
  path: '/api/v1/order',
  tag: 'Order',
})

OpenApiPath({
  path: '/api/v1/calculate',
  tag: 'Calculation',
})
