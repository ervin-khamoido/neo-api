2021

import { inject } from 'inversify'

import { httpDelete, requestParam, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationDelete } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'

import { UID } from '../../../models/openapi'

import { IUserBankAccountService, UserBankAccountServiceSymbol } from '../../../services/user-bank-account.service'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../middleware'
import { UserModel } from '../../../models/db'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

@httpDelete('/api/v1/user/bank-account/:userBank', FireAccessMiddleware(), PinAccessMiddleware)
export class DeleteUserBankAccountRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(UserBankAccountServiceSymbol) userBankAccountService!: IUserBankAccountService
  @inject(CurrentUserSymbol) user!: UserModel

  @OpenApiOperationDelete({
    path: '/api/v1/user/bank-account/{userBank}',
    description: 'Delete user bank account',
    summary: 'DELETE user bank account',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      path: { userBank: UID },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'User bank account deleted successfully' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestParam('userBank') userBank: string): Promise<void> {
    await this.uow.auto(() => this.userBankAccountService.delete(this.user, userBank))

    return this.empty()
  }
}
