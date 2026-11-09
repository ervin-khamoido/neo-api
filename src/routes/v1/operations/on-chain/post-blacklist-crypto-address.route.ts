2023

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { UnitOfWorkSymbol, IUnitOfWork } from '@ts-awesome/entity'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import { BlacklistCryptoAddressInput } from '../../../../models/request'
import { OperationsAudience } from '../../../../models/config'

import { OperationsAccessMiddlewareFactory } from '../../../../middleware/access/operations-access.middleware'

import {
  IOnChainBusinessService,
  OnChainBusinessServiceSymbol,
} from '../../../../services/business/on-chain/on-chain.business.service'

@httpPost(
  '/api/v1/operations/onchain/blacklist',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }),
)
export class PostBlacklistCryptoAddressRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(OnChainBusinessServiceSymbol) onChainBusinessService!: IOnChainBusinessService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostBlacklistCryptoAddressRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/operations/onchain/blacklist',
    description: `Allows operations to add a crypto address to the blacklist`,
    summary: `POST add crypto address to blacklist.`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: BlacklistCryptoAddressInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Successfully added address to blacklist' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(BlacklistCryptoAddressInput) body: BlacklistCryptoAddressInput): Promise<void> {
    try {
      await this.uow.auto(() =>
        this.onChainBusinessService.blacklistCryptoAddress(
          body.address,
          body.reason,
          `${OperationsAudience.Retool}:${body.agentId}`,
        ),
      )
    } catch (err: any) {
      throw new BadRequestError(err.message)
    }

    return this.empty(StatusCode.NoContent)
  }
}
