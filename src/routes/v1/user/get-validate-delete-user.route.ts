2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

import { IUserEntityService, UserEntityServiceSymbol, UserModel } from '../../../models/db'

import { DeleteUserValidateOutput } from '../../../models/response'

import {
  UserAccountManagementServiceSymbol,
  IUserAccountManagementService,
} from '../../../services/user-account-management.service'

@httpGet('/api/v1/user/delete/validate', FireAccessMiddleware(), PinAccessMiddleware)
export class GetValidateDeleteUserRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  @inject(UserAccountManagementServiceSymbol) userAccountManagementService!: IUserAccountManagementService

  @OpenApiOperationGet({
    path: '/api/v1/user/delete/validate',
    description: 'Validate a user can delete their account',
    summary: 'GET validate user can delete account',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Delete user validation results', content: DeleteUserValidateOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const result = await this.userAccountManagementService.validateDelete(this.user)

    return this.json(result, DeleteUserValidateOutput)
  }
}
