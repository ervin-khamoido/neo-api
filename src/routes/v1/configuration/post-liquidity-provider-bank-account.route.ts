2021

import { inject, named } from 'inversify'

import { httpPost, requestParam, requestBody, Route, StatusCode, BadRequestError } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { PostEntityOutput } from '../../../models/response'
import { Symbols as ValidatorSymbols } from '@ts-awesome/validate/dist/symbols'
import { SingleValidator } from '@ts-awesome/validate'

import { ConfigurationAccessMiddleware } from '../../../middleware/access/configuration-access.middleware'
import { LiquidityProviderBankAccountInput } from '../../../models/request/liquidity-provider-bank-account.input'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { UID } from '../../../models/openapi'
import {
  ILiquidityProviderConfigurationService,
  LiquidityProviderConfigurationServiceSymbol,
} from '../../../services/liquidity-provider-configuration.service'
import { ILiquidityProviderService, LiquidityProviderServiceSymbol } from '../../../services/liquidity-provider.service'

@httpPost('/api/v1/configuration/liquidity-provider/:liquidityProvider/bank-account', ConfigurationAccessMiddleware)
export class PostLiquidityProviderBankAccountRoute extends Route {
  @inject(LiquidityProviderServiceSymbol) liquidityProviderService!: ILiquidityProviderService
  @inject(LiquidityProviderConfigurationServiceSymbol) lpConfigurationService!: ILiquidityProviderConfigurationService
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(ValidatorSymbols.Validator)
  @named('uuid')
  uuidValidator!: SingleValidator<string>

  @OpenApiOperationPost({
    path: '/api/v1/configuration/liquidity-provider/{liquidityProvider}/bank-account',
    description: 'Add bank account to a liquidity provider',
    summary: 'Add bank account to a liquidity provider',
    security: [{ ConfigurationToken: [] }],
    request: {
      path: {
        liquidityProvider: UID,
      },
      body: {
        required: true,
        description: 'Liquidity Provider Bank Account information',
        schema: LiquidityProviderBankAccountInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Bank Account added to liquidity provider', content: PostEntityOutput },
      [StatusCode.BadRequest]: { description: 'Bank Account model is incorrect' },
      [StatusCode.Forbidden]: { description: 'Forbidden to access this resource' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(
    @requestParam('liquidityProvider') liquidityProviderUid: string,
    @requestBody(LiquidityProviderBankAccountInput) body: LiquidityProviderBankAccountInput,
  ): Promise<void> {
    this.validate(this.uuidValidator, liquidityProviderUid, 'Invalid liquidity provider uid', { required: true })

    if (!body?.bankName) {
      throw new BadRequestError('Invalid Bank Name')
    }

    if (!body?.bankAccountNumber) {
      throw new BadRequestError('Invalid Bank Account Number')
    }

    if (!body?.bankAccountName) {
      throw new BadRequestError('Invalid Bank Account Name')
    }

    if (!body?.helpDeskGroup) {
      throw new BadRequestError('Invalid HelpDesk agent group')
    }

    const [liquidityProvider] = await this.liquidityProviderService.getLiquidityProvider(liquidityProviderUid)

    const [liquidityProviderBankAccount] = await this.uow.auto(() =>
      this.lpConfigurationService.createLiquidityProviderBankAccount(liquidityProvider.id, body),
    )

    return this.json({ uid: liquidityProviderBankAccount.uid }, StatusCode.Created, PostEntityOutput)
  }
}
