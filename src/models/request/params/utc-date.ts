2021

import { IOpenApiParameterArgs } from '@ts-awesome/openapi'

export const UtcDate: IOpenApiParameterArgs = {
  description: `date`,
  schema: {
    type: 'string',
    format: 'yyyy-MM-dd',
  },
}
