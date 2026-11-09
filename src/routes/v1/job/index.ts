import { OpenApiPath } from '@ts-awesome/openapi'

export * from './post-incoming-wallet-processor.route'

OpenApiPath({
  path: '/api/v1/job',
  tag: 'Job',
})
