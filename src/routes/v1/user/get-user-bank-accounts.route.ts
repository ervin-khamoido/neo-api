2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'
import { of } from '@ts-awesome/orm'

import { CurrentUserSymbol } from '../../../middleware'
import {
  UserModel,
  UserBankAccountModel,
  UserBankAccountConfigModel,
  UserBankAccountEntityServiceSymbol,
  IUserBankAccountEntityService,
  BankEntityServiceSymbol,
  IBankEntityService,
} from '../../../models/db'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { UserBankAccountOutput } from '../../../models/response'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

@httpGet('/api/v1/user/bank-account', FireAccessMiddleware(), PinAccessMiddleware)
export class GetUserBankAccountsRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService
  @inject(BankEntityServiceSymbol) bankEntityService!: IBankEntityService

  @OpenApiOperationGet({
    path: '/api/v1/user/bank-account',
    description: 'Get user bank accounts',
    summary: 'GET user bank accounts',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'User bank accounts', content: [UserBankAccountOutput] },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const userBankAccounts = await this.userBankAccountEntityService
      .select()
      .join(UserBankAccountConfigModel, (root, other) => root.id.eq(other.userBankId))
      .where(x => x.userId.eq(this.user.id))
      .where(x => of(UserBankAccountConfigModel, 'isDeleted').eq(false))
      .fetch(UserBankAccountModel)

    // fetch all banks at once
    const bankIds = userBankAccounts.map(x => x.bankId)
    const banks = await this.bankEntityService.get(x => x.id.in(bankIds))

    // match the account and a bank. bank must exists because in DB it is NOT NULL Foreign Key
    const userBankAccountsOutput: UserBankAccountOutput[] = userBankAccounts.map(x => {
      const bank = banks.find(y => y.id === x.bankId)! // FK in DB

      // do not worry about spreading all fields in UserBankAccount
      // this.json(...) reads from objects only fields which are specified in OutputModel
      return { ...x, bank: bank.uid, bankName: bank.name }
    })

    return this.json(userBankAccountsOutput, [UserBankAccountOutput])
  }
}
