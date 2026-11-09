2021

import { inject } from 'inversify'

import { httpGet, queryParam, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentUserSymbol } from '../../../middleware'
import { UserModel } from '../../../models/db'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { UserSearchOutput } from '../../../models/response/user-search.output'
import { IUserService, UserServiceSymbol } from '../../../lib/user.service'
import { ILogger, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'

@httpGet('/api/v1/user/search', FireAccessMiddleware())
export class GetUserSearchRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserServiceSymbol) userService!: IUserService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(GetUserSearchRoute)
  }

  @OpenApiOperationGet({
    path: '/api/v1/user/search',
    description: 'Search users',
    summary: 'GET all users by query',
    security: [{ FireToken: [] }],
    request: {
      query: {
        qs: {
          description: 'Search string',
          required: true,
          schema: {
            type: 'string',
          },
        },
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'The list of users', content: [UserSearchOutput] },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@queryParam('qs', String) queryString: string): Promise<void> {
    const users = await this.userService.search(queryString)

    const usersWithoutMe: UserSearchOutput[] = users
      .filter(x => x.uid !== this.user.uid)
      .map(x => ({
        ...x,
        displayName: [x.firstName, x.lastName].join(' '),
      }))

    return this.json(usersWithoutMe, [UserSearchOutput])
  }
}
