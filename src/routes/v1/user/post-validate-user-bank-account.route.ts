// 2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import {
  UserModel,
  UserBankAccountEntityServiceSymbol,
  IUserBankAccountEntityService,
  IUserBankAccountConfigEntityService,
  UserBankAccountConfigEntityServiceSymbol,
} from '../../../models/db'

import { ValidateUserBankAccountOutput } from '../../../models/response'
import { UserBankAccountInput } from '../../../models/request'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

import { UserBankAccountServiceSymbol, IUserBankAccountService } from '../../../services/user-bank-account.service'
import { BankServiceSymbol, IBankService } from '../../../services/bank.service'

@httpPost('/api/v1/user/bank-account/validate', FireAccessMiddleware(), PinAccessMiddleware)
export class PostValidateUserBankAccountRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService
  @inject(UserBankAccountConfigEntityServiceSymbol)
  userBankAccountConfigEntityService!: IUserBankAccountConfigEntityService

  @inject(UserBankAccountServiceSymbol) bankAccountService!: IUserBankAccountService
  @inject(BankServiceSymbol) bankService!: IBankService

  @OpenApiOperationPost({
    path: '/api/v1/user/bank-account/validate',
    description: 'Post validate user bank account',
    summary: 'POST validate user bank account',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        schema: UserBankAccountInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'User bank account validation', content: ValidateUserBankAccountOutput },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(UserBankAccountInput) body: UserBankAccountInput): Promise<void> {
    const result = await this.uow.auto(() => this.validateUserBankAccount(body))

    return this.json(result, ValidateUserBankAccountOutput)
  }

  private async validateUserBankAccount(body: UserBankAccountInput): Promise<ValidateUserBankAccountOutput> {
    const bank = await this.bankService.getBank(body.bank)

    if (!bank) {
      throw new BadRequestError('Bank must be active and exist in our system')
    }

    return this.bankAccountService.validate(this.user, bank, body)
  }
}
