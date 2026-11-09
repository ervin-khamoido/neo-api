2023

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './get-incoming-crypto-address.route'

OpenApiPath({
  path: '/api/v2/on-chain',
  tag: 'On Chain',
})
