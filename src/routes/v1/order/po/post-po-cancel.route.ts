2021

import { inject } from 'inversify'

import { httpPost, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { UID } from '../../../../models/openapi'

import { CurrentOrderSymbol, CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { OrderAccessMiddleware } from '../../../../middleware/access/order-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

import {
  IOrderHelpdeskTicketEntityService,
  OrderHelpdeskTicketEntityServiceSymbol,
  OrderModel,
  UserModel,
} from '../../../../models/db'

import { FreshdeskTicketStatus, FreshdeskTicketType } from '../../../../models/freshdesk'
import { FreshdeskConfigSymbol, IFreshdeskConfig } from '../../../../models/config'

import { IPOStatusService, POStatusServiceSymbol } from '../../../../services/po-status.service'
import { ActivityServiceSymbol, IActivityService } from '../../../../services/activity/activity.service'
import { FreshdeskServiceSymbol, IFreshdeskService } from '../../../../services/freshdesk.service'

@httpPost('/api/v1/order/:order/purchase/cancel', FireAccessMiddleware(), PinAccessMiddleware, OrderAccessMiddleware)
export class PostPurchaseOrderCancelRoute extends Route {
  @inject(FreshdeskConfigSymbol) freshdeskConfig!: IFreshdeskConfig

  @inject(CurrentUserSymbol) user!: UserModel
  @inject(CurrentOrderSymbol) order!: OrderModel

  @inject(POStatusServiceSymbol) poStatusService!: IPOStatusService
  @inject(ActivityServiceSymbol) activityService!: IActivityService
  @inject(FreshdeskServiceSymbol) freshdeskService!: IFreshdeskService

  @inject(OrderHelpdeskTicketEntityServiceSymbol) orderTicketService!: IOrderHelpdeskTicketEntityService

  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostPurchaseOrderCancelRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/order/{order}/purchase/cancel',
    description: 'Cancel purchase order',
    summary: 'Cancel purchase order',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      path: { order: UID },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'Purchase order cancelled successfully' },
      [StatusCode.NotFound]: { description: 'Purchase order not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
      [StatusCode.Forbidden]: { description: 'Access to Purchase order is forbidden' },
      [StatusCode.PreconditionFailed]: { description: 'The purchase order is in invalid state' },
    },
  })
  public async handle(): Promise<void> {
    await this.uow.auto(() => this.update())

    return this.empty()
  }

  private async update(): Promise<void> {
    await this.poStatusService.cancel(this.order.id, this.user.uid)

    try {
      const statusReason = 'cancelled-by:user'
      await this.activityService.cancelPOActivity(this.order.id, statusReason, this.user.fireUserId)

      const ticket = await this.orderTicketService.getOne({
        orderId: this.order.id,
        ticketType: FreshdeskTicketType.Operations,
      })

      if (ticket) {
        await this.freshdeskService.createNote(
          ticket.ticketId,
          {
            body: 'Purchase Order Status: Cancelled',
          },
          true,
        )

        const custom_fields = {}
        custom_fields[
          `${this.freshdeskConfig.fields.purchase_order.ACTION.name}`
        ] = this.freshdeskConfig.fields.purchase_order.ACTION.choices.CANCELLED_SYSTEM

        await this.freshdeskService.updateTicket(ticket.ticketId, {
          status: FreshdeskTicketStatus.Resolved,
          custom_fields: custom_fields,
        })
      } else {
        this.logger.error(`The helpdesk ticket for this order id:${this.order.id} was not found`)
      }
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
    }
  }
}
