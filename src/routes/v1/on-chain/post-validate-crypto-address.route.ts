2023

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { ValidateCryptoAddressOutput } from '../../../models/response'
import { ValidateCryptoAddressInput } from '../../../models/request'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'

import {
  IOnChainBusinessService,
  OnChainBusinessServiceSymbol,
} from '../../../services/business/on-chain/on-chain.business.service'

@httpPost('/api/v1/on-chain/address/validate', FireAccessMiddleware())
export class PostValidateCryptoAddressRoute extends Route {
  @inject(OnChainBusinessServiceSymbol) onChainBusinessService!: IOnChainBusinessService

  @OpenApiOperationPost({
    path: '/api/v1/on-chain/address/validate',
    description: 'Validates a crypto address',
    summary: 'POST validate a crypto address',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Input needed to validate a crypto address',
        schema: ValidateCryptoAddressInput,
      },
    },
    responses: {
      [StatusCode.Success]: {
        description: 'The crypto address validation was successful',
        content: ValidateCryptoAddressOutput,
      },
      [StatusCode.BadRequest]: { description: 'Address is invalid', content: ValidateCryptoAddressOutput },
      [StatusCode.Forbidden]: { description: 'Address is blacklisted', content: ValidateCryptoAddressOutput },
      [StatusCode.NotFound]: { description: 'Network is not supported', content: ValidateCryptoAddressOutput },
      [StatusCode.ServerError]: {
        description: 'Could not validate address, unexpected error',
        content: ValidateCryptoAddressOutput,
      },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(ValidateCryptoAddressInput) body: ValidateCryptoAddressInput): Promise<void> {
    const { address, baseCoin, coin } = body

    try {
      await this.onChainBusinessService.verifyCryptoAddress(coin, address)
      await this.onChainBusinessService.verifyCryptoAddressBlacklist(address)
      await this.onChainBusinessService.verifyNetworkSupport(baseCoin)

      const belongsToNeoBank = await this.onChainBusinessService.belongsCryptoAddressToNeoBank(address)

      return this.json(
        {
          isAddressValid: true,
          addressValidationError: null,
          addressBelongsToNeoBank: belongsToNeoBank,
        },
        StatusCode.Success,
        ValidateCryptoAddressOutput,
      )
    } catch (err: any) {
      const message = err.message ?? 'Could not validate address.'
      const statusCode = err.statusCode ?? StatusCode.ServerError

      return this.json(
        {
          isAddressValid: false,
          addressValidationError: message,
          addressBelongsToNeoBank: false,
        },
        statusCode,
        ValidateCryptoAddressOutput,
      )
    }
  }
}
