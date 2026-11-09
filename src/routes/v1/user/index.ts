2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './get-me.route'
export * from './get-invitation-link.route'
export * from './post-user-invite.route'
export * from './get-user-balance.route'
export * from './get-user-bank-accounts.route'
export * from './get-limits.route'
export * from './post-user-bank-account.route'
export * from './post-validate-user-bank-account.route'
export * from './post-user-bank-account-batch-delete.route'
export * from './delete-user-bank-account.route'
export * from './get-user-settings.route'
export * from './get-user-status.route'
export * from './get-user-yield-balance.route'
export * from './post-user-default-currency.route'
export * from './get-validate-delete-user.route'
export * from './delete-user.route'
export * from './get-user-search.route'
export * from './get-user-card-balance.route'
export * from './get-user-activity-list.route'

export * from './pin'
export * from './push'
export * from './referrer'
export * from './details'
export * from './levels'
export * from './access'
export * from './card'
export * from './identity'
export * from './rewards'

OpenApiPath({
  path: '/api/v1/user',
  tag: 'User',
  security: [{ BearerAuth: [] }],
})
