2021

import { inject, injectable, named } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { DuplicateValueDbError } from '@ts-awesome/orm-pg'
import helpers from '../../lib/utils/helpers'

import {
  OrderHelpdeskTicketEntityServiceSymbol,
  IOrderHelpdeskTicketEntityService,
  PurchaseOrderEntityServiceSymbol,
  IPurchaseOrderEntityService,
  SellOrderStatus,
  PurchaseOrderStatus,
  IPurchaseOrderDetailsEntityService,
  SellOrderStatusReason,
  IUserBankAccountEntityService,
  UserBankAccountEntityServiceSymbol,
  IOrderStatusEntityService,
  OrderStatusEntityServiceSymbol,
  IUserEntityService,
  UserEntityServiceSymbol,
  IOrderEntityService,
  OrderEntityServiceSymbol,
  PurchaseOrderStatusReason,
  PurchaseOrderDetailsEntityServiceSymbol,
  ISellOrderEntityService,
  SellOrderEntityServiceSymbol,
  ISellOrderDetailsEntityService,
  SellOrderDetailsEntityServiceSymbol,
  TransactionStatus,
  OrderStatusModel,
  OrderModel,
} from '../../models/db'

import { ITicketOutput, FreshdeskTicketStatus, FreshdeskTicketPriority } from '../../models/freshdesk'
import { FreshdeskOperationsResolveInput } from '../../models/webhooks'
import { IFreshdeskConfig, FreshdeskConfigSymbol } from '../../models/config'

import { FreshdeskServiceSymbol, IFreshdeskService } from '../freshdesk.service'
import {
  POStatusServiceSymbol,
  IPOStatusService,
  OrderAlreadyHasCompletedTransactionError,
} from '../../services/po-status.service'
import { ISOStatusService, SOStatusServiceSymbol } from '../so-status.service'
import { ActivityServiceSymbol, IActivityService } from '../activity/activity.service'
import { ILiquidityProviderService, LiquidityProviderServiceSymbol } from '../liquidity-provider.service'
import { CalculatorServiceSymbol, ICalculatorService } from '../calculator.service'
import { IPurchaseOrderService, PurchaseOrderServiceSymbol } from '../purchase-order.service'
import { ITransactionService, TransactionServiceSymbol } from '../transaction/transaction.service'
import { ISellOrderService, SellOrderServiceSymbol } from '../sell-order.service'
import { IMailerService, MailerServiceSymbol } from '../../lib/services/mailer'
import { MailTemplates } from '../mailer/mailgun.service'
import { IPushService, PushServiceSymbol } from '../push.service'
import { IUserOrderService, UserOrderServiceSymbol } from '../user-order.service'
import { ICashbackService, CashbackSymbol } from '../cashback/cashback.service'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { IUserReferrerPayoutService, UserReferrerPayoutServiceSymbol } from '../referrals/user-referrer-payout.service'

export interface IFreshDeskWebhookService {
  resolveOperationsTicket(ticketId: string, payload: FreshdeskOperationsResolveInput): Promise<void>
}

export const FreshDeskWebhookServiceSymbol = Symbol.for('IFreshDeskWebhookService')

@injectable()
export class FreshDeskWebhookService implements IFreshDeskWebhookService {
  @inject(FreshdeskServiceSymbol)
  freshdeskService!: IFreshdeskService

  @inject(PurchaseOrderEntityServiceSymbol) purchaseOrderEntityService!: IPurchaseOrderEntityService
  @inject(OrderHelpdeskTicketEntityServiceSymbol) orderHelpdeskTicketEntityService!: IOrderHelpdeskTicketEntityService
  @inject(PurchaseOrderDetailsEntityServiceSymbol)
  purchaseOrderDetailsEntityService!: IPurchaseOrderDetailsEntityService
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(SellOrderEntityServiceSymbol) sellOrderEntityService!: ISellOrderEntityService
  @inject(SellOrderDetailsEntityServiceSymbol) sellOrderDetailsEntityService!: ISellOrderDetailsEntityService

  @inject(PurchaseOrderServiceSymbol) purchaseOrderService!: IPurchaseOrderService
  @inject(SellOrderServiceSymbol) sellOrderService!: ISellOrderService
  @inject(POStatusServiceSymbol) poStatusService!: IPOStatusService
  @inject(SOStatusServiceSymbol) soStatusService!: ISOStatusService
  @inject(TransactionServiceSymbol) transactionService!: ITransactionService
  @inject(ActivityServiceSymbol) activityService!: IActivityService
  @inject(LiquidityProviderServiceSymbol) liquidityProviderService!: ILiquidityProviderService
  @named('calculatorV2')
  @inject(CalculatorServiceSymbol)
  calculatorService!: ICalculatorService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(PushServiceSymbol) pushService!: IPushService
  @inject(UserOrderServiceSymbol) userOrderService!: IUserOrderService
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(CashbackSymbol) cashbackService!: ICashbackService
  @inject(UserReferrerPayoutServiceSymbol) userReferrerPayoutService!: IUserReferrerPayoutService

  @inject(FreshdeskConfigSymbol)
  config!: IFreshdeskConfig

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(FreshDeskWebhookService)
  }

  async resolveOperationsTicket(ticketId: string, payload: FreshdeskOperationsResolveInput): Promise<void> {
    const ticket = await this.freshdeskService.getTicket(ticketId)
    const internalTicketType = ticket.custom_fields[this.config.fields.general.INTERNAL_TYPE.name]

    const validStatuses = [FreshdeskTicketStatus.Resolved, FreshdeskTicketStatus.Closed]
    if (!validStatuses.includes(ticket.status!)) {
      throw new Error(`precondition failed: ticket status should be ${validStatuses}`)
    }

    switch (internalTicketType) {
      case this.config.fields.general.INTERNAL_TYPE.choices.PURCHASE_ORDER:
        let order = await this.uow.auto(() => this.resolvePurchaseOrderTicket(ticket))
        try {
          // Todo: Remove this is just a needed for staging test
          let startTime = new Date().getTime()

          await this.uow.auto(() => this.cashbackService.processCashBack(order.id))

          // Todo: Remove this is just a needed for staging test
          let endTime = new Date().getTime()
          let timeTaken = (endTime - startTime) / 1000
          this.logger.log(`Cashback Time taken: ${timeTaken} seconds`)
        } catch (err: any) {
          this.logger.warn('unexpected: could not process cashback')
          this.logger.error(err)
        }

        await this.userReferrerPayoutService.schedulePayoutReward(order.userId)

        break
      case this.config.fields.general.INTERNAL_TYPE.choices.SELL_ORDER:
        await this.uow.auto(() => this.resolveSellOrderTicket(ticket))
        break
      default:
        throw new Error(`unsupported: ticket internal type ${internalTicketType} is not supported`)
    }
  }

  private async resolvePurchaseOrderTicket(ticket: ITicketOutput): Promise<OrderModel> {
    const poTicket = helpers.requireFields(ticket, 'id', 'custom_fields')

    const purchaseOrderAction = poTicket.custom_fields[this.config.fields.purchase_order.ACTION.name]

    const bankTransactionReference =
      poTicket.custom_fields[this.config.fields.purchase_order.CUSTOMER_BANK_TRANSACTION_NUMBER.name]
    const bankTransactionAmount = await this.calculatorService.convertCurrencyStringToNumber(
      poTicket.custom_fields[this.config.fields.purchase_order.CUSTOMER_BANK_TRANSACTION_AMOUNT.name],
    )
    const refundTransactionReference =
      poTicket.custom_fields[this.config.fields.purchase_order.REFUND_BANK_TRANSACTION_NUMBER.name]
    const refundTransactionAmount = await this.calculatorService.convertCurrencyStringToNumber(
      poTicket.custom_fields[this.config.fields.purchase_order.REFUND_BANK_TRANSACTION_AMOUNT.name],
    )

    const refundReason = poTicket.custom_fields[this.config.fields.purchase_order.REFUND_REASON.name]

    const orderHelpdeskTicket = await this.orderHelpdeskTicketEntityService.getOne({ ticketId: poTicket.id.toString() })
    if (!orderHelpdeskTicket) {
      throw new Error(`precondition failed: order helpdesk ticket id:${poTicket.id} not found`)
    }

    const [order, purchaseOrder] = await Promise.all([
      this.orderEntityService.getOne({ id: orderHelpdeskTicket.orderId }),
      this.purchaseOrderEntityService.getOne({ orderId: orderHelpdeskTicket.orderId }),
    ])

    if (!order || !purchaseOrder) {
      throw new Error(`precondition failed: purchase order id:${orderHelpdeskTicket.orderId} not found`)
    }

    const actionPerformedBy = `freshdesk:${poTicket.responder_id}`
    switch (purchaseOrderAction) {
      case this.config.fields.purchase_order.ACTION.choices.CONFIRM: {
        this.logger.info(
          `Starting PO confirmation process for order id ${orderHelpdeskTicket.orderId} and ticket id ${orderHelpdeskTicket.ticketId}`,
        )

        const lpBalance = await this.liquidityProviderService.getBalance(purchaseOrder.liquidityProviderId)
        const lpAgentHasRequiredUsdcAmount = await this.calculatorService.isAmountGreaterThanLimit(
          lpBalance.balance,
          purchaseOrder.totalUsdc,
        )

        // Verify LP agent has enough USDC to complete the PO
        if (!lpAgentHasRequiredUsdcAmount) {
          this.logger.error(`LP Agent has insufficient USDC for purchase order id:${purchaseOrder.orderId}`)

          try {
            await this.freshdeskService.createNote(
              orderHelpdeskTicket.ticketId,
              {
                body: 'The USDC amount on LP wallet is not enough for the transaction',
              },
              true,
            )

            await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
              status: FreshdeskTicketStatus.Open,
            })
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }

          break
        }

        if (purchaseOrder.total !== bankTransactionAmount) {
          this.logger.error(
            `Bank transaction amount (${bankTransactionAmount}) does not match purchase order amount (${purchaseOrder.total})`,
          )

          try {
            await this.freshdeskService.createNote(
              orderHelpdeskTicket.ticketId,
              {
                body: `Bank transaction amount (${bankTransactionAmount}) does not match purchase order amount (${purchaseOrder.total}).`,
              },
              true,
            )

            await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
              status: FreshdeskTicketStatus.Open,
            })
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }

          break
        }

        try {
          await this.purchaseOrderDetailsEntityService.updateOne({
            orderId: orderHelpdeskTicket.orderId,
            bankTransactionReference: bankTransactionReference,
            bankTransactionAmount: bankTransactionAmount,
            changedBy: actionPerformedBy,
          })
        } catch (err: any) {
          if (err instanceof DuplicateValueDbError) {
            this.logger.error(
              `Bank transaction reference (${bankTransactionReference}) was already added to another purchase order`,
            )

            try {
              await this.freshdeskService.createNote(
                orderHelpdeskTicket.ticketId,
                {
                  body: `Bank transaction reference (${bankTransactionReference}) was already added to another purchase order.`,
                },
                true,
              )

              await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
                status: FreshdeskTicketStatus.Open,
              })
            } catch (err: any) {
              const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
              this.logger.error(errorMessage)
            }

            break
          }

          throw err
        }

        const currentStatus = await this.orderStatusEntityService.getOne({ orderId: orderHelpdeskTicket.orderId })
        if (!currentStatus) {
          throw new Error('Unexpected: No order status found')
        }

        let confirmationResult = null
        if (currentStatus.status === PurchaseOrderStatus.Failed) {
          try {
            confirmationResult = await this.poStatusService.confirmRetry(orderHelpdeskTicket.orderId, actionPerformedBy)
          } catch (err: any) {
            if (err instanceof OrderAlreadyHasCompletedTransactionError) {
              try {
                await this.freshdeskService.createNote(
                  orderHelpdeskTicket.ticketId,
                  {
                    body: `Cannot confirm the order because there already is a successful transaction attached to this order. Contact the developers for further assistance.`,
                  },
                  true,
                )

                await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
                  status: FreshdeskTicketStatus.Open,
                })
              } catch (err: any) {
                const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
                this.logger.error(errorMessage)
              }
            }

            // rethrow
            throw err
          }
        } else {
          confirmationResult = await this.poStatusService.confirm(orderHelpdeskTicket.orderId, actionPerformedBy)
        }

        const { orderStatus, transactionStatusChangeResult } = confirmationResult

        if (orderStatus) {
          try {
            await this.activityService.updatePOActivity(
              orderHelpdeskTicket.orderId,
              <PurchaseOrderStatus>orderStatus.status,
              PurchaseOrderStatusReason.None,
            )
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }
        }

        // Trigger transaction status change
        if (transactionStatusChangeResult.changed) {
          await this.purchaseOrderService.onTransactionStatusChanged(transactionStatusChangeResult.transactionStatus)
        }

        // Treat this functionality as a callbak from external system about transaction status change
        // We know that it is completed right away
        if (
          transactionStatusChangeResult &&
          transactionStatusChangeResult.transactionStatus.status === TransactionStatus.Pending
        ) {
          try {
            const result = await this.transactionService.complete(
              transactionStatusChangeResult.transactionStatus.transactionId,
            )

            if (result.changed) {
              //FIGURE: do we want to do this is in parallel?
              await this.purchaseOrderService.onTransactionStatusChanged(result.transactionStatus)
            }
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }
        }

        break
      }
      case this.config.fields.purchase_order.ACTION.choices.PAYMENT_NOT_RECEIVED: {
        const user = await this.userEntityService.getOne({ id: order.userId })
        if (!user) {
          throw new Error(`Unexpected error: user not found`)
        }

        const orderStatus = await this.poStatusService.paymentNotReceived(
          orderHelpdeskTicket.orderId,
          actionPerformedBy,
        )

        if (orderStatus) {
          try {
            await this.activityService.updatePOActivity(
              orderHelpdeskTicket.orderId,
              <PurchaseOrderStatus>orderStatus.status,
              PurchaseOrderStatusReason.None,
            )

            await this.pushService.send(user, {
              title: `Uh oh! We did not receive your payment.`,
              body: `We haven’t received funds for your saving and have marked your transaction as “payment not received”. If you feel like this was an error please chat with us on Whatsapp - We’d love to help!`,
            })
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }
        }
        break
      }
      case this.config.fields.purchase_order.ACTION.choices.REFUND: {
        if (bankTransactionAmount !== refundTransactionAmount) {
          this.logger.error(
            `Refund transaction amount (${refundTransactionAmount}) does not match the bank transaction amount (${bankTransactionAmount})`,
          )

          try {
            await this.freshdeskService.createNote(
              orderHelpdeskTicket.ticketId,
              {
                body: `Refund transaction amount (${refundTransactionAmount}) does not match the bank transaction amount (${bankTransactionAmount}).`,
              },
              true,
            )

            await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
              status: FreshdeskTicketStatus.Open,
            })
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }

          break
        }

        let statusReason = null
        let refundReasonDescription = 'an error with transferring funds'
        switch (refundReason) {
          case this.config.fields.purchase_order.REFUND_REASON.choices.EXPIRED:
            statusReason = PurchaseOrderStatusReason.Expired
            refundReasonDescription = 'an expired timeframe'
            break
          case this.config.fields.purchase_order.REFUND_REASON.choices.WRONG_AMOUNT:
            statusReason = PurchaseOrderStatusReason.WrongAmount
            refundReasonDescription = 'an incorrect amount'
            break
          default:
            statusReason = PurchaseOrderStatusReason.None
        }

        const orderStatus = await this.poStatusService.refunded(
          orderHelpdeskTicket.orderId,
          actionPerformedBy,
          statusReason,
        )

        if (orderStatus) {
          try {
            await this.purchaseOrderDetailsEntityService.updateOne({
              orderId: orderHelpdeskTicket.orderId,
              bankTransactionReference: bankTransactionReference,
              bankTransactionAmount: refundTransactionAmount,
              refundBankTransactionReference: refundTransactionReference,
              refundBankTransactionAmount: refundTransactionAmount,
              changedBy: actionPerformedBy,
            })
          } catch (err: any) {
            if (err instanceof DuplicateValueDbError) {
              this.logger.error(
                `Bank transaction reference (${bankTransactionReference}) or refund transaction reference (${refundTransactionReference}) was already added to another purchase order`,
              )

              try {
                await this.freshdeskService.createNote(
                  orderHelpdeskTicket.ticketId,
                  {
                    body: `Bank transaction reference (${bankTransactionReference}) or refund transaction reference (${refundTransactionReference}) was already added to another purchase order.`,
                  },
                  true,
                )

                await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
                  status: FreshdeskTicketStatus.Open,
                })
              } catch (err: any) {
                const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
                this.logger.error(errorMessage)
              }

              break
            }

            this.logger.error(err)
            throw new Error(`Unexpected error while refunding purchase order with id: ${purchaseOrder.orderId}`)
          }

          try {
            await this.activityService.updatePOActivity(
              orderHelpdeskTicket.orderId,
              <PurchaseOrderStatus>orderStatus.status,
              statusReason,
            )
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }

          const user = await this.userEntityService.getOne({ id: order.userId })
          if (!user) {
            throw new Error(`Unexpected error: user not found`)
          }

          await this.mailerService.send({
            subject: 'We had to refund your transaction.',
            to: user.email,
            template: {
              name: MailTemplates.RefundComplete,
              variables: {
                reason: refundReasonDescription,
              },
              conditionalContent: {},
            },
          })

          await this.pushService.send(user, {
            title: `We had to refund your transaction.`,
            body: `We had to refund your transaction. This is likely because of ${refundReasonDescription}. If you believe this is an error, please contact customer support - we’d love to help!`,
          })
        }
        break
      }
      case this.config.fields.purchase_order.ACTION.choices.CANCELLED_SYSTEM: {
        const orderStatus = await this.orderStatusEntityService.getOne({ orderId: orderHelpdeskTicket.orderId })
        if (!orderStatus) {
          throw new Error(`precondition failed: order status for order id:${orderHelpdeskTicket.orderId} not found`)
        }

        const user = await this.userEntityService.getOne({ id: order.userId })

        const { status, changedBy } = orderStatus
        const expectedChangedBy = `user:${user?.uid}`

        // If the PO is not in a cancelled status or the changed by value is not the user:uid, then reopen the ticket - someone else tried to cancel it
        if (status !== PurchaseOrderStatus.Cancelled || changedBy !== expectedChangedBy) {
          this.logger.warn(
            `Order helpdesk ticket ${orderHelpdeskTicket.ticketId} could not be resolved. PO action (${purchaseOrderAction}) is not allowed. Action performed by ${actionPerformedBy}.`,
          )

          try {
            await this.freshdeskService.createNote(
              orderHelpdeskTicket.ticketId,
              {
                body: `Ticket could not be resolved. PO action (${purchaseOrderAction}) is not allowed.`,
              },
              true,
            )

            await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
              status: FreshdeskTicketStatus.Open,
            })
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }
        }

        break
      }
      default: {
        this.logger.warn(
          `Order helpdesk ticket ${orderHelpdeskTicket.ticketId} could not be resolved. PO action (${purchaseOrderAction}) is not allowed.`,
        )

        try {
          await this.freshdeskService.createNote(
            orderHelpdeskTicket.ticketId,
            {
              body: `Ticket could not be resolved. PO action (${purchaseOrderAction}) is not allowed.`,
            },
            true,
          )

          await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
            status: FreshdeskTicketStatus.Open,
          })
        } catch (err: any) {
          const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
          this.logger.error(errorMessage)
        }

        break
      }
    }

    return order
  }

  private async resolveSellOrderTicket(ticket: ITicketOutput): Promise<void> {
    const soTicket = helpers.requireFields(ticket, 'id', 'custom_fields')

    const sellOrderAction = soTicket.custom_fields[this.config.fields.sell_order.ACTION.name]

    const bankTransactionReference = soTicket.custom_fields[this.config.fields.sell_order.BANK_TRANSACTION_NUMBER.name]
    const bankTransactionAmount = await this.calculatorService.convertCurrencyStringToNumber(
      soTicket.custom_fields[this.config.fields.sell_order.BANK_TRANSACTION_AMOUNT.name],
    )

    const orderHelpdeskTicket = await this.orderHelpdeskTicketEntityService.getOne({ ticketId: soTicket.id.toString() })
    if (!orderHelpdeskTicket) {
      throw new Error(`precondition failed: order helpdesk ticket id:${soTicket.id} not found`)
    }

    const [order, sellOrder] = await Promise.all([
      this.orderEntityService.getOne({ id: orderHelpdeskTicket.orderId }),
      this.sellOrderEntityService.getOne({ orderId: orderHelpdeskTicket.orderId }),
    ])
    if (!order || !sellOrder) {
      throw new Error(`precondition failed: sell order id:${orderHelpdeskTicket.orderId} not found`)
    }

    const actionPerformedBy = `freshdesk:${soTicket.responder_id}`
    switch (sellOrderAction) {
      case this.config.fields.sell_order.ACTION.choices.PAYMENT_SENT: {
        // Verify the sell order total matches the bank transaction amount
        if (sellOrder.total !== bankTransactionAmount) {
          this.logger.error(
            `Bank transaction amount (${bankTransactionAmount}) does not match sell order amount (${sellOrder.total})`,
          )

          try {
            await this.freshdeskService.createNote(
              orderHelpdeskTicket.ticketId,
              {
                body: `Bank transaction amount (${bankTransactionAmount}) does not match sell order amount (${sellOrder.total}).`,
              },
              true,
            )

            await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
              status: FreshdeskTicketStatus.Open,
            })
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }

          break
        }

        try {
          await this.sellOrderDetailsEntityService.updateOne({
            orderId: orderHelpdeskTicket.orderId,
            bankTransactionReference: bankTransactionReference,
            bankTransactionAmount: bankTransactionAmount,
            changedBy: actionPerformedBy,
          })
        } catch (err: any) {
          if (err instanceof DuplicateValueDbError) {
            this.logger.error(
              `Bank transaction reference (${bankTransactionReference}) was already added to another sell order`,
            )

            try {
              await this.freshdeskService.createNote(
                orderHelpdeskTicket.ticketId,
                {
                  body: `Bank transaction reference (${bankTransactionReference}) was already added to another sell order.`,
                },
                true,
              )

              await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
                status: FreshdeskTicketStatus.Open,
              })
            } catch (err: any) {
              const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
              this.logger.error(errorMessage)
            }

            break
          }

          throw err
        }

        const orderStatus = await this.soStatusService.paymentSent(orderHelpdeskTicket.orderId, actionPerformedBy)
        if (orderStatus) {
          try {
            await this.activityService.updateSOActivity(
              orderHelpdeskTicket.orderId,
              <SellOrderStatus>orderStatus.status,
              SellOrderStatusReason.None,
            )

            await this.freshdeskService.createNote(
              orderHelpdeskTicket.ticketId,
              {
                body: `Sell Order Status: Waiting for confirmation from the User.`,
              },
              true,
            )

            await this.freshdeskService.updateTicket(orderHelpdeskTicket.ticketId, {
              priority: FreshdeskTicketPriority.Medium,
              status: FreshdeskTicketStatus.WaitingOnCustomer,
            })
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }
        }
        break
      }
      case this.config.fields.sell_order.ACTION.choices.REFUND: {
        const [orderStatus, transactionStatus] = await this.soStatusService.refundInitiated(
          orderHelpdeskTicket.orderId,
          actionPerformedBy,
        )
        if (orderStatus) {
          try {
            await this.activityService.updateSOActivity(
              orderHelpdeskTicket.orderId,
              <SellOrderStatus>orderStatus.status,
              SellOrderStatusReason.None,
            )
          } catch (err: any) {
            const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
            this.logger.error(errorMessage)
          }

          if (transactionStatus) {
            try {
              const transactionStatusResult = await this.transactionService.complete(transactionStatus.transactionId)

              if (transactionStatusResult.changed) {
                //FIGURE: do we want to do this is in parallel?
                await this.sellOrderService.onTransactionStatusChanged(transactionStatusResult.transactionStatus)
              }
            } catch (err: any) {
              const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
              this.logger.error(errorMessage)
            }
          }
        }
        break
      }
      default:
        throw new Error(`unsupported: sell order action ${sellOrderAction} is not supported`)
    }
  }
}
