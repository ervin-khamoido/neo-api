2021

import { IOpenApiParameterArgs } from '@ts-awesome/openapi'

export const HASH: IOpenApiParameterArgs = {
  description: `Hash`,
  schema: {
    type: 'string',
  },
  required: true,
}

export const UID: IOpenApiParameterArgs = {
  description: `uid`,
  schema: {
    type: 'string',
    format: 'uuid',
  },
  required: true,
}
