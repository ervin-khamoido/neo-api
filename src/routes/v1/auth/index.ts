2021

import { OpenApiPath } from '@ts-awesome/openapi'

export * from './post-email-verify.route'
export * from './post-sign-in.route'
export * from './post-email.route'
export * from './post-sign-up.route'
export * from './post-phone-validate.route'
export * from './post-referrer-verify.route'

export * from './phone'

OpenApiPath({
  path: '/api/v1/auth',
  tag: 'Auth',
})
