2023

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './get-incoming-crypto-address.route'
export * from './post-validate-crypto-address.route'

OpenApiPath({
  path: '/api/v1/on-chain',
  tag: 'On Chain',
})
