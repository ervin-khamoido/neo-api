2021

import { Route, httpGet } from '@ts-awesome/rest'
import { OpenApiPath, OpenApiOperationGet } from '@ts-awesome/openapi'

import { VersionOutput } from '../models/response'
import { inject } from 'inversify'
import { BuildNumberConfigSymbol, IBuildNumberConfig } from '../models/config/build-number.config'

@httpGet('/api/versions')
export class Versions extends Route {
  @inject(BuildNumberConfigSymbol) buildNumberConfig!: IBuildNumberConfig

  @OpenApiOperationGet({
    path: '/api/versions',
    description: 'Get versions objects list',
    summary: 'Get versions list',
    responses: {
      200: { content: VersionOutput },
    },
  })
  public async handle(): Promise<void> {
    const versions = [
      {
        id: 1,
        name: 'API Version 1',
        description: 'Neobank API Version 1',
        version: this.buildNumberConfig.buildId,
      },
    ]

    this.json(versions)
  }
}

OpenApiPath({
  path: '/api/versions',
  tag: 'Version',
})
