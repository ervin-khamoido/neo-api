2021

import { inject } from 'inversify'

import { httpPost, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { UID } from '../../../../models/openapi'

import { CurrentOrderSymbol, CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'

import {
  IOrderHelpdeskTicketEntityService,
  OrderHelpdeskTicketEntityServiceSymbol,
  OrderModel,
  PurchaseOrderStatusReason,
  PurchaseOrderStatus,
  UserModel,
} from '../../../../models/db'
import { OrderAccessMiddleware } from '../../../../middleware/access/order-access.middleware'
import { IPOStatusService, POStatusServiceSymbol } from '../../../../services/po-status.service'
import { ActivityServiceSymbol, IActivityService } from '../../../../services/activity/activity.service'
import { FreshdeskServiceSymbol, IFreshdeskService } from '../../../../services/freshdesk.service'
import { FreshdeskTicketPriority, FreshdeskTicketStatus } from '../../../../models/freshdesk'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

@httpPost('/api/v1/order/:order/purchase/paid', FireAccessMiddleware(), PinAccessMiddleware, OrderAccessMiddleware)
export class PostPurchaseOrderPaidRoute extends Route {
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

    this.logger = loggerFactory(PostPurchaseOrderPaidRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/order/{order}/purchase/paid',
    description: 'Mark purchase order as paid',
    summary: 'POST Mark purchase order as paid',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      path: { order: UID },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'Purchase order marked as paid successfully' },
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
    const orderStatus = await this.poStatusService.paymentSent(this.order.id, this.user.uid)

    if (orderStatus) {
      try {
        await this.activityService.updatePOActivity(
          this.order.id,
          PurchaseOrderStatus.PaymentSent,
          PurchaseOrderStatusReason.None,
          this.user.fireUserId,
        )

        const ticket = await this.orderTicketService.getOne({ orderId: this.order.id })

        if (ticket) {
          await this.freshdeskService.createNote(
            ticket.ticketId,
            {
              body: 'Purchase Order Status: Payment Sent',
            },
            true,
          )

          await this.freshdeskService.updateTicket(ticket.ticketId, {
            status: FreshdeskTicketStatus.Open,
            priority: FreshdeskTicketPriority.Urgent,
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
}
