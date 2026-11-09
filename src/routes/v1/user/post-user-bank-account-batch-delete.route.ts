2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, requestParam, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'

import { IUserBankAccountService, UserBankAccountServiceSymbol } from '../../../services/user-bank-account.service'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { UserBankAccountBatchDeleteInput } from '../../../models/request'
import { CurrentUserSymbol } from '../../../middleware'
import { UserModel } from '../../../models/db'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

@httpPost('/api/v1/user/bank-account/batch-delete', FireAccessMiddleware(), PinAccessMiddleware)
export class PostUserBankAccountBatchDeleteRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(UserBankAccountServiceSymbol) userBankAccountService!: IUserBankAccountService
  @inject(CurrentUserSymbol) user!: UserModel

  @OpenApiOperationPost({
    path: '/api/v1/user/bank-account/batch-delete',
    description: 'Delete multiple user bank accounts',
    summary: 'DELETE multiple user bank accounts',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: { required: true, schema: UserBankAccountBatchDeleteInput, description: 'User bank account UIDs' },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'User bank accounts deleted successfully' },
      [StatusCode.BadRequest]: { description: 'Payload is not valid' },
      [StatusCode.NotFound]: { description: 'User bank accounts where not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(
    @requestBody(UserBankAccountBatchDeleteInput) body: UserBankAccountBatchDeleteInput,
  ): Promise<void> {
    if (!body?.userBanks) {
      throw new BadRequestError('Invalid request params')
    }

    if (!body.userBanks.length) {
      throw new BadRequestError('No user banks for deletion')
    }

    await this.uow.auto(() => this.userBankAccountService.batchDelete(this.user, body.userBanks!))

    return this.empty()
  }
}
