2023

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { inject, injectable } from 'inversify'

import { FirestoreActivityServiceSymbol, IFirestoreActivityService } from '../../../activity/firestore-activity.service'
import {
  ActivityEntityServiceSymbol,
  ActivityModel,
  ActivityStatusEntityServiceSymbol,
  ActivityType,
  CardOrderActivityStatus,
  CardOrderEntityServiceSymbol,
  CardOrderModel,
  CardOrderType,
  IActivityEntityService,
  IActivityStatusEntityService,
  ICardOrderEntityService,
  IOrderEntityService,
  IUserCardEntityService,
  IUserEntityService,
  OrderEntityServiceSymbol,
  UserCardEntityServiceSymbol,
  UserCardModel,
  UserEntityServiceSymbol,
} from '../../../../models/db'
import {
  ICardOrderDetails,
  ICardOrderFeeDetails,
  ICardOrderFundDetails,
  ICardOrderReversalDetails,
  ICardOrderSpendDetails,
  ICardOrderUnloadDetails,
} from '../../../../models/db/activity/co-activity-details'
import { USDC } from '../../../../utils/formatter'

export interface ICOActivityService {
  /**
   * Create the activity in DB from the order by ID, and sync with Firestore.
   * The method does not throw if the synchronization is failed. See logs for the reason.
   *
   * @param orderId The order ID for which the activity is created.
   * @param ts The optional timestamp of the activity
   */
  createActivity(orderId: number, ts?: Date): Promise<void>

  /**
   * Creates the "completed" status in the activity by order's ID, and sync with Firestore.
   * The method does not throw if the synchronization is failed. See logs for the reason.
   *
   * @param orderId The order ID for which the activity is created.
   * @param ts The optional timestamp of the activity
   */
  completeActivity(orderId: number, ts?: Date): Promise<void>

  /**
   * Creates the "failed" status in the activity by order's ID, and sync with Firestore.
   * The method does not throw if the synchronization is failed. See logs for the reason.
   *
   * @param orderId The order ID for which the activity is created.
   * @param reason The reason of the failure can be specified.
   * @param ts The optional timestamp of the activity
   */
  failActivity(orderId: number, reason?: string, ts?: Date): Promise<void>
}

export const COActivityServiceSymbol = Symbol.for('ICOActivityService')

@injectable()
export class COActivityService implements ICOActivityService {
  @inject(ActivityEntityServiceSymbol) activityEntityService!: IActivityEntityService
  @inject(ActivityStatusEntityServiceSymbol) activityStatusEntityService!: IActivityStatusEntityService
  @inject(FirestoreActivityServiceSymbol) firestoreActivityService!: IFirestoreActivityService

  @inject(OrderEntityServiceSymbol) orderService!: IOrderEntityService
  @inject(CardOrderEntityServiceSymbol) cardOrderService!: ICardOrderEntityService
  @inject(UserCardEntityServiceSymbol) userCardService!: IUserCardEntityService
  @inject(UserEntityServiceSymbol) userService!: IUserEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(COActivityService)
  }

  async createActivity(orderId: number, ts: Date = new Date()): Promise<void> {
    const [order, coOrder] = await Promise.all([
      this.orderService.getOne({ id: orderId }),
      this.cardOrderService.getOne({ orderId: orderId }),
    ])
    if (!order) {
      this.logger.error(`unexpected: order is not found id:${orderId}`)
      throw new Error('Order is not found')
    }
    if (!coOrder) {
      this.logger.error(`unexpected: card order is not found id:${orderId}`)
      throw new Error('Card order is not found')
    }

    const [user, userCard] = await Promise.all([
      this.userService.getOne({ id: order.userId }),
      this.userCardService.getOne({ id: coOrder.cardId }),
    ])
    if (!user) {
      this.logger.error(`unexpected: user associated to the order is not found id:${order.userId}`)
      throw new Error('User is not found')
    }
    if (!userCard) {
      this.logger.error(`unexpected: card associated to the order is not found id:${coOrder.cardId}`)
      throw new Error('Card is not found')
    }

    const activity = await this.activityEntityService.addOne({
      orderId: order.id,
      orderReferenceNumber: order.referenceNumber,
      amount: 0,
      amountUsdc: coOrder.amountUsdc,
      type: ActivityType.Card,
      comment: 'v1',
      details: this.getActivityDetails(coOrder.type, userCard, coOrder),
      userId: order.userId,
    })

    await this.activityStatusEntityService.addOne({
      activityId: activity.id,
      status: CardOrderActivityStatus.Pending,
      statusReason: '',
      statusDatetime: ts,
    })

    try {
      await this.firestoreActivityService.publishActivity(user.fireUserId, activity)
    } catch (err) {
      this.logger.error(`critical: failure to publish the activity to Firestore. activity uid:${activity.uid}`)
    }
  }

  async completeActivity(orderId: number, ts: Date = new Date()): Promise<void> {
    const activity = await this.activityEntityService.getOne({ orderId: orderId })
    if (!activity) {
      this.logger.error(`unexpected: activity associated to the order is not found id:${orderId}`)
      throw new Error('Activity is not found')
    }

    await this.activityStatusEntityService.addOne({
      activityId: activity.id,
      status: CardOrderActivityStatus.Completed,
      statusReason: '',
      statusDatetime: ts,
    })

    await this.syncActivityStatus(activity)
  }

  async failActivity(orderId: number, reason?: string, ts: Date = new Date()): Promise<void> {
    const activity = await this.activityEntityService.getOne({ orderId: orderId })
    if (!activity) {
      this.logger.error(`unexpected: activity associated to the order is not found id:${orderId}`)
      throw new Error('Activity is not found')
    }

    await this.activityStatusEntityService.addOne({
      activityId: activity.id,
      status: CardOrderActivityStatus.Failed,
      statusReason: reason ?? '',
      statusDatetime: ts,
    })

    await this.syncActivityStatus(activity)
  }

  private async syncActivityStatus(activity: ActivityModel): Promise<void> {
    const user = await this.userService.getOne({ id: activity.userId })
    if (!user) {
      this.logger.error(`unexpected: user associated to the activity is not found id:${activity.userId}`)
      throw new Error('User is not found')
    }

    try {
      await this.firestoreActivityService.pushActivityStatus(user.fireUserId, activity)
    } catch (err) {
      this.logger.error(`critical: failure to sync the activity with Firestore. activity uid:${activity.uid}`)
    }
  }

  private getActivityDetails(
    type: CardOrderType,
    userCard: UserCardModel,
    cardOrder: CardOrderModel,
  ): ICardOrderDetails {
    const buildCardNumber = (x?: string | null) => `**** **** **** ${x ?? '0000'}`

    switch (type) {
      case CardOrderType.Fund:
      case CardOrderType.InitialFund:
        return {
          type: ActivityType.Card,
          orderType: CardOrderType.Fund,
          card: userCard.uid,
          cardNumber: buildCardNumber(userCard.last4Digits),
          fee: cardOrder.feeUsdc,
          feeFormatted: USDC(cardOrder.feeUsdc, false),
        } as ICardOrderFundDetails
      case CardOrderType.Spend:
        return {
          type: ActivityType.Card,
          orderType: CardOrderType.Spend,
          card: userCard.uid,
          cardNumber: buildCardNumber(userCard.last4Digits),
          providerDescription: cardOrder.providerDescription,
          fee: cardOrder.feeUsdc,
          feeFormatted: USDC(cardOrder.feeUsdc, false),
        } as ICardOrderSpendDetails
      case CardOrderType.Unload:
      case CardOrderType.Reversal:
      case CardOrderType.Fee:
      case CardOrderType.SpendFee:
        return {
          type: ActivityType.Card,
          orderType: type,
          card: userCard.uid,
          cardNumber: buildCardNumber(userCard.last4Digits),
        } as ICardOrderDetails
    }
  }
}
