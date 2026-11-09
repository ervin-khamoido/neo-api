2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { IUserDetailsEntityService, UserDetailsEntityServiceSymbol, UserModel } from '../../../../models/db'
import { UsernameInput } from '../../../../models/request/username.input'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../../middleware'
import { IUsernameService, UsernameServiceSymbol } from '../../../../services/username.service'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { IsolationLevel } from '@ts-awesome/orm'

@httpPost('/api/v1/user/details/username', FireAccessMiddleware(), PinAccessMiddleware)
export class PostUserDetailsUsernameRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService

  @inject(UsernameServiceSymbol) usernameService!: IUsernameService

  @inject(CurrentUserSymbol) user!: UserModel

  @OpenApiOperationPost({
    path: '/api/v1/user/details/username',
    description: `Create a username for the user`,
    summary: 'POST a username',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        schema: UsernameInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'The username has successfully been created' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.NotFound]: { description: 'User details are not found' },
      [StatusCode.Conflict]: { description: 'The username has already been set. Call /me to get the latest data' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(UsernameInput) body: UsernameInput): Promise<void> {
    const result = await this.usernameService.validate(body.username)

    if (!result.valid) {
      throw new BadRequestError(result.errors?.join('\n'))
    }

    await this.uow.auto(async () => {
      await this.uow.setIsolationLevel(IsolationLevel.RepeatableRead)
      await this.usernameService.create(this.user.id, body.username)
    })

    return this.empty(StatusCode.Created)
  }
}
