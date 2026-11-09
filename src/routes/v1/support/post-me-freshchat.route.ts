import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'

import { UserModel } from '../../../models/db'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../middleware'

import {
  IUserFreshchatEntityService,
  UserFreshchatEntityServiceSymbol,
  UserFreshchatUniqueIndex,
} from '../../../models/db/user-freshchat.model'
import { UserFreshchatInput } from '../../../models/request/user-freshchat.input'
import validation from '../../../lib/utils/validation'

@httpPost('/api/v1/support/me/freshchat', FireAccessMiddleware())
export class PathUserMeFreshchatRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(validation.symbolFor(UserFreshchatInput)) validator!: IValidator<UserFreshchatInput>

  @inject(UserFreshchatEntityServiceSymbol) userFreshchatService!: IUserFreshchatEntityService

  @OpenApiOperationPost({
    path: '/api/v1/support/me/freshchat',
    description: `Patch user's freshchat info`,
    summary: "Patch user's freshchat info",
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        schema: UserFreshchatInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'The restore ID is accepted' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(UserFreshchatInput) body: UserFreshchatInput): Promise<void> {
    this.validate(this.validator, body)

    await this.userFreshchatService.upsertOne(
      {
        userId: this.user.id,
        restoreId: body.restoreId,
      },
      UserFreshchatUniqueIndex,
    )

    return this.empty(StatusCode.Success)
  }
}
