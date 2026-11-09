2021

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode, BadRequestError } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { PostEntityOutput } from '../../../models/response'

import { ConfigurationAccessMiddleware } from '../../../middleware/access/configuration-access.middleware'
import { LiquidityProviderInput } from '../../../models/request/liquidity-provider.input'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import {
  ILiquidityProviderConfigurationService,
  LiquidityProviderConfigurationServiceSymbol,
} from '../../../services/liquidity-provider-configuration.service'

@httpPost('/api/v1/configuration/liquidity-provider', ConfigurationAccessMiddleware)
export class PostLiquidityProviderRoute extends Route {
  @inject(LiquidityProviderConfigurationServiceSymbol) lpConfigurationService!: ILiquidityProviderConfigurationService
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @OpenApiOperationPost({
    path: '/api/v1/configuration/liquidity-provider',
    description: 'Create a liquidity provider',
    summary: 'Create a liquidity provider',
    security: [{ ConfigurationToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Liquidity Provider information',
        schema: LiquidityProviderInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Created liquidity provider', content: PostEntityOutput },
      [StatusCode.BadRequest]: { description: 'Liquidity provider model is incorrect' },
      [StatusCode.Forbidden]: { description: 'Forbidden to access this resource' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(LiquidityProviderInput) body: LiquidityProviderInput): Promise<void> {
    if (!body?.name) {
      throw new BadRequestError('Invalid Liquidity Provider Name')
    }

    if (!body?.helpDeskRepresentativeGroupId) {
      throw new BadRequestError('Invalid HelpDesk Representative group Id')
    }

    let [liquidityProvider] = await this.uow.auto(() => this.lpConfigurationService.createLiquidityProvider(body))

    return this.json({ uid: liquidityProvider.uid }, StatusCode.Created, PostEntityOutput)
  }
}
