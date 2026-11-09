2021

import { inject } from 'inversify'

import { httpPost, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { NGN } from '../../../../utils/formatter'

import { UID } from '../../../../models/openapi'
import { FreshdeskTicketStatus, FreshdeskTicketType } from '../../../../models/freshdesk/common'

import {
  IOrderHelpdeskTicketEntityService,
  OrderHelpdeskTicketEntityServiceSymbol,
  OrderModel,
  SellOrderStatusReason,
  SellOrderStatus,
  UserModel,
  ISellOrderEntityService,
  SellOrderEntityServiceSymbol,
  IUserBankAccountEntityService,
  UserBankAccountEntityServiceSymbol,
} from '../../../../models/db'

import { CurrentOrderSymbol, CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { OrderAccessMiddleware } from '../../../../middleware/access/order-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

import { ISOStatusService, SOStatusServiceSymbol } from '../../../../services/so-status.service'
import { ActivityServiceSymbol, IActivityService } from '../../../../services/activity/activity.service'
import { FreshdeskServiceSymbol, IFreshdeskService } from '../../../../services/freshdesk.service'
import { IUserOrderService, UserOrderServiceSymbol } from '../../../../services/user-order.service'
import { IUserReferrerService, UserReferrerServiceSymbol } from '../../../../services/referrals/user-referrer.service'
import { IMailerService, MailerServiceSymbol, MailTemplates } from '../../../../lib/services/mailer'
import { IPushService, PushServiceSymbol } from '../../../../services/push.service'

@httpPost(
  '/api/v1/order/:order/sell/payment-confirmed',
  FireAccessMiddleware(),
  PinAccessMiddleware,
  OrderAccessMiddleware,
)
export class PostSellOrderPaymentConfirmedRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel
  @inject(CurrentOrderSymbol) order!: OrderModel

  @inject(SOStatusServiceSymbol) soStatusService!: ISOStatusService
  @inject(ActivityServiceSymbol) activityService!: IActivityService
  @inject(FreshdeskServiceSymbol) freshdeskService!: IFreshdeskService
  @inject(UserOrderServiceSymbol) userOrderService!: IUserOrderService
  @inject(UserReferrerServiceSymbol) userReferrerService!: IUserReferrerService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(PushServiceSymbol) pushService!: IPushService

  @inject(OrderHelpdeskTicketEntityServiceSymbol) orderTicketEntityService!: IOrderHelpdeskTicketEntityService
  @inject(SellOrderEntityServiceSymbol) sellOrderEntityService!: ISellOrderEntityService
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService

  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostSellOrderPaymentConfirmedRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/order/{order}/sell/payment-confirmed',
    description: 'Sell order payment confirmed',
    summary: 'POST sell order payment confirmed',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      path: { order: UID },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'Sell order payment confirmed successfully' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
      [StatusCode.Forbidden]: { description: 'Access to sell order is forbidden' },
      [StatusCode.PreconditionFailed]: { description: 'The sell order is in invalid state' },
    },
  })
  public async handle(): Promise<void> {
    await this.uow.auto(() => this.update())

    return this.empty()
  }

  private async update(): Promise<void> {
    const orderStatus = await this.soStatusService.paymentConfirmedByUser(this.order.id, this.user.uid)

    if (orderStatus) {
      try {
        await this.activityService.updateSOActivity(
          this.order.id,
          SellOrderStatus.PaymentConfirmedByUser,
          SellOrderStatusReason.None,
          this.user.fireUserId,
        )

        const ticket = await this.orderTicketEntityService.getOne({
          orderId: this.order.id,
          ticketType: FreshdeskTicketType.Operations,
        })

        if (ticket) {
          await this.freshdeskService.createNote(
            ticket.ticketId,
            {
              body: 'Sell Order Status: Payment Confirmed by User',
            },
            true,
          )

          await this.freshdeskService.updateTicket(ticket.ticketId, {
            status: FreshdeskTicketStatus.Resolved,
          })

          await this.sendNotifications(this.user, this.order)
        } else {
          this.logger.error(`The helpdesk ticket for this order id:${this.order.id} was not found`)
        }
      } catch (err: any) {
        const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
        this.logger.error(errorMessage)
      }
    }
  }

  private async sendNotifications(user: UserModel, order: OrderModel) {
    const sellOrder = await this.sellOrderEntityService.getOne({ orderId: order.id })
    if (!sellOrder) {
      throw new Error(`Unexpected error: No sell order found for order (${order.referenceNumber})`)
    }

    const userBankAccount = await this.userBankAccountEntityService.getOne({ id: sellOrder.userBankAccountId })
    if (!userBankAccount) {
      throw new Error(`Unexpected error: user not found`)
    }

    const invitationLink = await this.userReferrerService.getOrCreateInvitationLink(order.userId)
    const formattedAmount = NGN(sellOrder.total, false)
    await this.mailerService.send({
      subject: 'Your withdrawal was successful 🎉',
      to: user.email,
      template: {
        name: MailTemplates.WithdrawComplete,
        variables: {
          amount: formattedAmount,
          public_bank_account_number: userBankAccount.bankAccountNumberPublic,
          invitation_link: invitationLink ?? '',
        },
        conditionalContent: {
          invitation_link: invitationLink ? true : false,
        },
      },
    })

    const hasCompleteSellOrder = await this.userOrderService.hasCompleteSellOrder(user.id, [order.id])
    if (!hasCompleteSellOrder) {
      await this.pushService.send(user, {
        title: `You’ve completed your first withdrawal 🎉`,
        body: `Your withdrawal to your bank account was successful! We hope to see you again - we’re rooting for you!`,
      })
    } else {
      await this.pushService.send(user, {
        title: `Withdrawal Successful 🎉`,
        body: `We just credited ${formattedAmount} to your account ending in ${userBankAccount.bankAccountNumberPublic}.`,
      })
    }
  }
}
