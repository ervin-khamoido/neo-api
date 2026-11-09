2023

import { inject } from 'inversify'

import { httpPatch, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPatch } from '@ts-awesome/openapi'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {CurrentUserSymbol, OneTimeAccessMiddleware} from '../../../middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'

import { UserModel } from '../../../models/db'

import {
  IVirtualCardBusinessService,
  VirtualCardBusinessServiceSymbol,
} from '../../../services/business/card/virtual-card.business.service'
import { OneTimeAction } from '../../../services/pin-code.service'

@httpPatch('/api/v1/card/unfreeze',
  FireAccessMiddleware( { checkRevoked: true }),
  OneTimeAccessMiddleware({ action: OneTimeAction.UnfreezeCard }),
)
export class PatchUnfreezeVirtualCardRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(VirtualCardBusinessServiceSymbol) virtualCardBusinessService!: IVirtualCardBusinessService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PatchUnfreezeVirtualCardRoute)
  }

  @OpenApiOperationPatch({
    path: '/api/v1/card/unfreeze',
    description: 'Unfreeze a virtual card as requested by the user',
    summary: 'PATCH unfreeze a virtual card - requested by the user',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.NoContent]: { description: 'Successfully unfroze virtual card' },
      [StatusCode.NotFound]: { description: 'Virtual card not found for user' },
      [StatusCode.BadRequest]: { description: 'Virtual card is not available or is not able to be unfrozen' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    // Unfreeze the user's virtual card
    await this.virtualCardBusinessService.unfreezeVirtualCard(this.user.id)

    return this.empty(StatusCode.NoContent)
  }
}
