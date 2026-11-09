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
  UserBankAccountModel,
} from '../../../models/db'

import { PostEntityOutput } from '../../../models/response'
import { UserBankAccountInput } from '../../../models/request'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

import { IPaystackService, PaystackServiceSymbol } from '../../../services/paystack.service'
import { UserBankAccountServiceSymbol, IUserBankAccountService } from '../../../services/user-bank-account.service'
import { BankServiceSymbol, IBankService } from '../../../services/bank.service'

@httpPost('/api/v1/user/bank-account', FireAccessMiddleware(), PinAccessMiddleware)
export class PostUserBankAccountRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService
  @inject(UserBankAccountConfigEntityServiceSymbol)
  userBankAccountConfigEntityService!: IUserBankAccountConfigEntityService

  @inject(UserBankAccountServiceSymbol) bankAccountService!: IUserBankAccountService
  @inject(BankServiceSymbol) bankService!: IBankService

  @inject(PaystackServiceSymbol) paystackService!: IPaystackService

  @OpenApiOperationPost({
    path: '/api/v1/user/bank-account',
    description: 'Post save user bank account',
    summary: 'POST save user bank account',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        schema: UserBankAccountInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'New user bank account', content: PostEntityOutput },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(UserBankAccountInput) body: UserBankAccountInput): Promise<void> {
    const bankAccount = await this.uow.auto(() => this.createUserBankAccount(body))

    return this.json(bankAccount, StatusCode.Created, PostEntityOutput)
  }

  private async createUserBankAccount(body: UserBankAccountInput): Promise<UserBankAccountModel> {
    const bank = await this.bankService.getBank(body.bank)

    if (!bank) {
      throw new BadRequestError('Bank must be active and exist in our system')
    }

    return this.bankAccountService.create(this.user, bank, body)
  }
}
