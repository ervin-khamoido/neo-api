2023

import { inject } from 'inversify'

import { httpPatch, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPatch } from '@ts-awesome/openapi'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { CurrentUserSymbol } from '../../../middleware'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

import { UserModel } from '../../../models/db'

import {
  IVirtualCardBusinessService,
  VirtualCardBusinessServiceSymbol,
} from '../../../services/business/card/virtual-card.business.service'

@httpPatch('/api/v1/card/freeze', FireAccessMiddleware(), PinAccessMiddleware)
export class PatchFreezeVirtualCardRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(VirtualCardBusinessServiceSymbol) virtualCardBusinessService!: IVirtualCardBusinessService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PatchFreezeVirtualCardRoute)
  }

  @OpenApiOperationPatch({
    path: '/api/v1/card/freeze',
    description: 'Freeze a virtual card as requested by the user',
    summary: 'PATCH freeze a virtual card - requested by the user',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.NoContent]: { description: 'Successfully froze virtual card' },
      [StatusCode.NotFound]: { description: 'Virtual card not found for user' },
      [StatusCode.BadRequest]: { description: 'Virtual card is not available or is not able to be frozen' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    // Freeze the user's virtual card
    await this.virtualCardBusinessService.freezeVirtualCard(this.user.id)

    return this.empty(StatusCode.NoContent)
  }
}
