import { inject, injectable } from 'inversify'
import {
  CardOrderEntityServiceSymbol,
  ICardOrderEntityService,
  IOrderEntityService,
  IUserCardEntityService,
  IUserDetailsEntityService,
  OrderEntityServiceSymbol,
  UserCardEntityServiceSymbol,
  UserDetailsEntityServiceSymbol,
} from '../../../../models/db'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { NotFoundError } from '@ts-awesome/rest'
import { IPushService, PushServiceSymbol } from '../../../push.service'
import { USDC } from '../../../../utils/formatter'
import { MailTemplates } from '../../../mailer/mailgun.service'
import { IMailerService, MailerServiceSymbol } from '../../../../lib/services/mailer'

export interface ICardNotificationService {
  notifyTopUpViaPush(orderId: number): Promise<void>
  notifyTopUpViaEmail(orderId: number): Promise<void>

  notifySpendViaPush(orderId: number): Promise<void>
  notifySpendViaEmail(orderId: number): Promise<void>

  notifyCreationViaPush(cardId: number): Promise<void>
  notifyCardFrozenViaPush(cardId: number): Promise<void>
  notifyCardUnfrozenViaPush(cardId: number): Promise<void>
}

export const CardNotificationServiceSymbol = Symbol.for('ICardNotificationService')

@injectable()
export class CardNotificationService implements ICardNotificationService {
  @inject(OrderEntityServiceSymbol) orderService!: IOrderEntityService
  @inject(CardOrderEntityServiceSymbol) cardOrderService!: ICardOrderEntityService
  @inject(UserCardEntityServiceSymbol) userCardService!: IUserCardEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService

  @inject(PushServiceSymbol) pushService!: IPushService
  @inject(MailerServiceSymbol) mailerService!: IMailerService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(CardNotificationService)
  }

  async notifyTopUpViaPush(orderId: number): Promise<void> {
    const [order, cardOrder] = await Promise.all([
      this.orderService.getOne({ id: orderId }),
      this.cardOrderService.getOne({ orderId: orderId }),
    ])
    if (!order) {
      this.logger.error(`critical: order is not found id:${orderId}`)
      throw new NotFoundError('Order is not found')
    }
    if (!cardOrder) {
      this.logger.error(`critical: card order is not found id:${orderId}`)
      throw new NotFoundError('Card order is not found')
    }

    const displayAmount = USDC(cardOrder.amountUsdc, false)

    await this.pushService.scheduleSend({
      userId: order.userId,
      reason: 'card:top-up',
      payload: {
        version: 'v1',
        title: 'Card Top-up',
        body: `You have successfully topped up your card with ${displayAmount}.`,
      },
    })
  }

  async notifyTopUpViaEmail(orderId: number): Promise<void> {
    const [order, cardOrder] = await Promise.all([
      this.orderService.getOne({ id: orderId }),
      this.cardOrderService.getOne({ orderId: orderId }),
    ])
    if (!order) {
      this.logger.error(`critical: order is not found id:${orderId}`)
      throw new NotFoundError('Order is not found')
    }
    if (!cardOrder) {
      this.logger.error(`critical: card order is not found id:${orderId}`)
      throw new NotFoundError('Card order is not found')
    }

    const userDetails = await this.userDetailsService.getOne({ userId: order.userId })
    if (!userDetails) {
      this.logger.error(`critical: user details are not found userId:${order.userId}`)
      throw new NotFoundError('User details are not found')
    }

    const displayFullName = userDetails.fullName ?? 'Friend'
    const displayAmount = USDC(cardOrder.amountUsdc, false)

    await this.mailerService.send({
      to: userDetails.email,
      subject: 'Successful Card Top-up',
      template: {
        name: MailTemplates.CardTopUpSuccessful,
        variables: {
          full_name: displayFullName,
          top_up_amount: displayAmount,
        },
        conditionalContent: {},
      },
    })
  }

  async notifySpendViaPush(orderId: number): Promise<void> {
    const [order, cardOrder] = await Promise.all([
      this.orderService.getOne({ id: orderId }),
      this.cardOrderService.getOne({ orderId: orderId }),
    ])
    if (!order) {
      this.logger.error(`critical: order is not found id:${orderId}`)
      throw new NotFoundError('Order is not found')
    }
    if (!cardOrder) {
      this.logger.error(`critical: card order is not found id:${orderId}`)
      throw new NotFoundError('Card order is not found')
    }

    const userCard = await this.userCardService.getOne({ id: cardOrder.cardId })
    if (!userCard) {
      this.logger.error(`critical: user card is not found cardId:${cardOrder.cardId}`)
      throw new NotFoundError('User card is not found')
    }

    const displayAmount = USDC(cardOrder.amountUsdc, false)

    await this.pushService.scheduleSend({
      userId: order.userId,
      reason: 'card:spend',
      payload: {
        version: 'v1',
        title: 'Card Payment Successful',
        body:
          `You have successfully made a payment of ${displayAmount} with your card.` +
          `****${userCard.last4Digits} for ${cardOrder.providerDescription ?? 'purchase'}.`,
      },
    })
  }

  async notifySpendViaEmail(orderId: number): Promise<void> {
    const [order, cardOrder] = await Promise.all([
      this.orderService.getOne({ id: orderId }),
      this.cardOrderService.getOne({ orderId: orderId }),
    ])
    if (!order) {
      this.logger.error(`critical: order is not found id:${orderId}`)
      throw new NotFoundError('Order is not found')
    }
    if (!cardOrder) {
      this.logger.error(`critical: card order is not found id:${orderId}`)
      throw new NotFoundError('Card order is not found')
    }

    const [userDetails, userCard] = await Promise.all([
      this.userDetailsService.getOne({ userId: order.userId }),
      this.userCardService.getOne({ id: cardOrder.cardId }),
    ])
    if (!userDetails) {
      this.logger.error(`critical: user details are not found userId:${order.userId}`)
      throw new NotFoundError('User details are not found')
    }
    if (!userCard) {
      this.logger.error(`critical: user card is not found cardId:${cardOrder.cardId}`)
      throw new NotFoundError('User card is not found')
    }

    const displayFullName = userDetails.fullName ?? 'Friend'
    const displayAmount = USDC(cardOrder.amountUsdc, false)
    const displayLast4Digits = userCard.last4Digits ?? '0000'
    const displayDescription = cardOrder.providerDescription ?? 'purchase'

    await this.mailerService.send({
      to: userDetails.email,
      subject: 'Card Payment Successful',
      template: {
        name: MailTemplates.CardSpendSuccessful,
        variables: {
          full_name: displayFullName,
          spend_amount: displayAmount,
          last_4_digits: displayLast4Digits,
          payment_description: displayDescription,
        },
        conditionalContent: {},
      },
    })
  }

  async notifyCreationViaPush(cardId: number): Promise<void> {
    const userCard = await this.userCardService.getOne({ id: cardId })
    if (!userCard) {
      this.logger.error(`critical: user card is not found cardId:${cardId}`)
      throw new NotFoundError('User card is not found')
    }

    await this.pushService.scheduleSend({
      userId: userCard.userId,
      reason: 'card:create',
      payload: {
        version: 'v1',
        title: 'Card Creation Successful',
        body: `Your card has been successfully created. You can now add money and start spending!`,
      },
    })
  }

  async notifyCardFrozenViaPush(cardId: number): Promise<void> {
    const userCard = await this.userCardService.getOne({ id: cardId })
    if (!userCard) {
      this.logger.error(`critical: user card is not found cardId:${cardId}`)
      throw new NotFoundError('User card is not found')
    }

    await this.pushService.scheduleSend({
      userId: userCard.userId,
      reason: 'card:freeze',
      payload: {
        version: 'v1',
        title: 'Card Frozen Successfully',
        body: `Your card ****${userCard.last4Digits} has been frozen. You can unfreeze in the Neobank app.`,
      },
    })
  }

  async notifyCardUnfrozenViaPush(cardId: number): Promise<void> {
    const userCard = await this.userCardService.getOne({ id: cardId })
    if (!userCard) {
      this.logger.error(`critical: user card is not found cardId:${cardId}`)
      throw new NotFoundError('User card is not found')
    }

    await this.pushService.scheduleSend({
      userId: userCard.userId,
      reason: 'card:unfreeze',
      payload: {
        version: 'v1',
        title: 'Card Unfrozen Successfully',
        body: `Your card ****${userCard.last4Digits} has been unfrozen. You can now make payments.`,
      },
    })
  }
}
