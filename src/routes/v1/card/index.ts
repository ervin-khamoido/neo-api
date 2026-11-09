2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './post-create-card.route'
export * from './post-fund-card.route'
export * from './post-unload-card.route'
export * from './get-card-issue-verify.route'
export * from './get-card-issue-info.route'
export * from './patch-freeze-card.route'
export * from './patch-unfreeze-card.route'

OpenApiPath({
  path: '/api/v1/card',
  tag: 'Card',
})
