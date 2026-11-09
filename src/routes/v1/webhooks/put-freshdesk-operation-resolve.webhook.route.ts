2021

import { inject } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { httpPut, requestBody, requestParam, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiDataType, OpenApiOperationPut } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { FreshdeskOperationsResolveInput } from '../../../models/webhooks'

import { CurrentOrderSymbol } from '../../../middleware'

import {
  FreshDeskWebhookServiceSymbol,
  IFreshDeskWebhookService,
} from '../../../services/webhooks/freshdesk.webhook.service'
import {
  IOrderEntityService,
  IOrderHelpdeskTicketEntityService,
  IUserEntityService,
  OrderEntityServiceSymbol,
  OrderHelpdeskTicketEntityServiceSymbol,
  OrderModel,
  UserEntityServiceSymbol,
} from '../../../models/db'
import { FreshdeskServiceSymbol, IFreshdeskService } from '../../../services/freshdesk.service'

@httpPut('/api/v1/webhook/freshdesk/ticket/:ticketId/operations/resolve')
export class FreshdeskWebhookRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(FreshDeskWebhookServiceSymbol) freshdeskWebhookService!: IFreshDeskWebhookService
  @inject(FreshdeskServiceSymbol) freshdeskService!: IFreshdeskService

  @inject(OrderHelpdeskTicketEntityServiceSymbol) orderHelpdeskTicketEntityService!: IOrderHelpdeskTicketEntityService
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(FreshdeskWebhookRoute)
  }

  @OpenApiOperationPut({
    path: '/api/v1/webhook/freshdesk/ticket/{ticketId}/operations/resolve',
    description: 'Ticket gets resolved by operations',
    summary: 'Ticket gets resolved by operations',
    security: [{ WebhookToken: [] }],
    request: {
      path: {
        ticketId: {
          schema: {
            type: OpenApiDataType.number,
          },
        },
      },
      body: {
        required: true,
        schema: FreshdeskOperationsResolveInput,
      },
    },
    responses: {
      [StatusCode.Accepted]: { description: 'Webhook call was resolved' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(
    @requestParam('ticketId') ticketId: string,
    @requestBody(FreshdeskOperationsResolveInput) body: FreshdeskOperationsResolveInput,
  ): Promise<void> {
    this.logger.info(`Received Freshdesk webhook for ticket id: ${ticketId}`)

    try {
      const ticket = await this.orderHelpdeskTicketEntityService.getOne({ ticketId: ticketId })
      if (!ticket) {
        throw new Error(`Order helpdesk ticket (${ticketId}) was not found`)
      }

      const order = await this.orderEntityService.getOne({ id: ticket.orderId })
      if (!order) {
        throw new Error(`Order was not found`)
      }

      this.request.container?.rebind<OrderModel>(CurrentOrderSymbol).toConstantValue(order)
    } catch (err: any) {
      this.logger.error(err)
    }

    try {
      await this.freshdeskWebhookService.resolveOperationsTicket(ticketId, body)
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
    }

    // in any case we need to return a success and all errors should be handled asynchronously
    return this.empty(StatusCode.Accepted)
  }
}
