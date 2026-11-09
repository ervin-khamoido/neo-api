2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './get-yield-apr.route'
export * from './patch-user-full-name.route'
export * from './patch-user-address.route'
export * from './post-user-unblock.route'
export * from './post-user-approve-verification.route'
export * from './post-approve-user-bank-account.route'
export * from './post-add-ambassadors.route'
export * from './patch-remove-ambassadors.route'
export * from './post-user-block.route'

export * from './reward'
export * from './card'
export * from './reporting'
export * from './on-chain'

OpenApiPath({
  path: '/api/v1/operations',
  tag: 'Operations',
})
