2023

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

import { UserModel } from '../../../../models/db'
import { UserCardStatusOutput } from '../../../../models/response'

import { CardServiceSymbol, ICardService } from '../../../../services/dumb/card/card.service'

@httpGet('/api/v1/user/card/status', FireAccessMiddleware(), PinAccessMiddleware)
export class GetUserCardStatusRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(CardServiceSymbol) cardService!: ICardService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(GetUserCardStatusRoute)
  }

  @OpenApiOperationGet({
    path: '/api/v1/user/card/status',
    description: `Gets the user's virtual card status`,
    summary: `GET user virtual card status`,
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Created]: { description: 'User virtual card status', content: UserCardStatusOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    // Get the user's card status
    const userCardStatus = await this.cardService.getCardStatus(this.user.id)

    return this.json({ status: userCardStatus }, UserCardStatusOutput)
  }
}
