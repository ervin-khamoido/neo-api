2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './post-liquidity-provider.route'
export * from './post-liquidity-provider-bank-account.route'
export * from './post-bank-sync.route'

OpenApiPath({
  path: '/api/v1/configuration',
  tag: 'Configuration',
})
