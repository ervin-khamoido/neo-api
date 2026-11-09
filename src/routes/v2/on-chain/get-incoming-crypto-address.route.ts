2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../middleware'
import { UserModel } from '../../../models/db'
import { IncomingCryptoAddressOutput } from '../../../models/response'
import {
  IOnChainBusinessService,
  OnChainBusinessServiceSymbol,
} from '../../../services/business/on-chain/on-chain.business.service'

@httpGet('/api/v2/on-chain/incoming-crypto-address', FireAccessMiddleware())
export class GetIncomingCryptoAddressV2Route extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(OnChainBusinessServiceSymbol) onChainBusinessService!: IOnChainBusinessService

  @OpenApiOperationGet({
    path: '/api/v2/on-chain/incoming-crypto-address',
    description: "Get user's incoming crypto address",
    summary: "GET user's incoming crypto address",
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Invitation Link', content: IncomingCryptoAddressOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    await this.onChainBusinessService.ensureIncomingCryptoAddressExists(this.user.id)

    const address = await this.onChainBusinessService.getIncomingCryptoAddress(this.user.id)

    return this.json({ address }, StatusCode.Success, IncomingCryptoAddressOutput)
  }
}
