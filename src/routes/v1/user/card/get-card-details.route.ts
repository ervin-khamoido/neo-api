2023

import { inject } from 'inversify'

import { httpGet, NotFoundError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

import { UserModel } from '../../../../models/db'
import { CardDetailsOutput } from '../../../../models/response'

import { CardServiceSymbol, ICardService } from '../../../../services/dumb/card/card.service'

@httpGet('/api/v1/user/card', FireAccessMiddleware({ checkRevoked: true }), PinAccessMiddleware)
export class GetUserCardDetailsRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(CardServiceSymbol) cardService!: ICardService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(GetUserCardDetailsRoute)
  }

  @OpenApiOperationGet({
    path: '/api/v1/user/card',
    description: `Gets the user's virtual card details`,
    summary: `GET user's virtual card details`,
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Created]: { description: 'Virtual card details', content: CardDetailsOutput },
      [StatusCode.NotFound]: { description: 'User does not have a virtual card', content: CardDetailsOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    // Get the user's card details
    const cardDetails = await this.cardService.getCardDetails(this.user.id)

    if (!cardDetails) {
      throw new NotFoundError('Virtual card not found.')
    }

    return this.json(cardDetails, CardDetailsOutput)
  }
}
