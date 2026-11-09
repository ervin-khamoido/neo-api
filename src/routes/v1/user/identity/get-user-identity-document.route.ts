2021

import { inject } from 'inversify'

import { httpGet, queryParam, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'
import { IdentityServiceSymbol, IIdentityService } from '../../../../services/dumb/identity/identity.service'

@httpGet('/api/v1/user/identity/document')
export class GetUserIdentityDocumentRoute extends Route {
  @inject(IdentityServiceSymbol) identityService!: IIdentityService

  @OpenApiOperationGet({
    path: '/api/v1/user/identity/document',
    description: "Get user's identity document",
    summary: "GET user's identity document",
    security: [],
    request: {
      query: {
        payload: {
          required: true,
          schema: {
            type: 'string',
          },
        },
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'Identity document stream' },
      [StatusCode.NotFound]: { description: 'Identity document not found' },
    },
  })
  public async handle(@queryParam('payload') payload: string): Promise<void> {
    try {
      const stream = await this.identityService.streamDocumentPicture(payload)
      if (!stream) {
        return this.empty(StatusCode.NotFound)
      }

      await this.stream(stream, stream.total, 'image/jpeg')
    } catch (err) {
      return this.empty(StatusCode.NotFound)
    }
  }
}
