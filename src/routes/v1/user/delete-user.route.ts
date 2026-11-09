2021

import { inject } from 'inversify'

import { httpDelete, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationDelete } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol, OneTimeAccessMiddleware } from '../../../middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

import { UserModel } from '../../../models/db'
import { DeleteUserValidateOutput } from '../../../models/response'

import {
  IUserAccountManagementService,
  UserAccountManagementServiceSymbol,
} from '../../../services/user-account-management.service'
import { OneTimeAction } from '../../../services/pin-code.service'

@httpDelete(
  '/api/v1/user/delete/confirm',
  FireAccessMiddleware({ checkRevoked: true }),
  OneTimeAccessMiddleware({ action: OneTimeAction.DeleteNEOBANKAccount }),
)
export class DeleteUserRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserAccountManagementServiceSymbol) userAccountManagementService!: IUserAccountManagementService

  @OpenApiOperationDelete({
    path: '/api/v1/user/delete/confirm',
    description: 'Delete user account',
    summary: 'DELETE user account',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Delete user account process successful' },
      [StatusCode.BadRequest]: { description: 'Invalid request, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    await this.uow.auto(() => this.userAccountManagementService.delete(this.user))

    return this.empty(StatusCode.Success)
  }
}
