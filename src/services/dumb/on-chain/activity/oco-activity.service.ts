2023

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { inject, injectable } from 'inversify'

import { FirestoreActivityServiceSymbol, IFirestoreActivityService } from '../../../activity/firestore-activity.service'
import {
  ActivityEntityServiceSymbol,
  ActivityModel,
  ActivityStatusEntityServiceSymbol,
  ActivityType,
  IActivityEntityService,
  IActivityStatusEntityService,
  IOnChainOrderEntityService,
  IOnChainOrderFeeEntityService,
  IOrderEntityService,
  IUserEntityService,
  OnChainOrderActivityStatus,
  OnChainOrderEntityServiceSymbol,
  OnChainOrderFeeEntityServiceSymbol,
  OnChainOrderModel,
  OnChainOrderType,
  OrderEntityServiceSymbol,
  UserEntityServiceSymbol,
} from '../../../../models/db'
import { IOnChainOrderDetails } from '../../../../models/db/activity/oco-activity-details'
import { IOnChainFeeResult } from '../../../../models/on-chain'

export interface IOCOActivityService {
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

export const OCOActivityServiceSymbol = Symbol.for('IOCOActivityService')

@injectable()
export class OCOActivityService implements IOCOActivityService {
  @inject(ActivityEntityServiceSymbol) activityEntityService!: IActivityEntityService
  @inject(ActivityStatusEntityServiceSymbol) activityStatusEntityService!: IActivityStatusEntityService
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(OnChainOrderEntityServiceSymbol) onChainOrderEntityService!: IOnChainOrderEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(OnChainOrderFeeEntityServiceSymbol) onChainOrderFeeEntityService!: IOnChainOrderFeeEntityService

  @inject(FirestoreActivityServiceSymbol) firestoreActivityService!: IFirestoreActivityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(OCOActivityService)
  }

  async createActivity(orderId: number, ts: Date = new Date()): Promise<void> {
    const [order, ocoOrder] = await Promise.all([
      this.orderEntityService.getOne({ id: orderId }),
      this.onChainOrderEntityService.getOne({ orderId: orderId }),
    ])
    if (!order) {
      this.logger.error(`unexpected: order is not found id:${orderId}`)
      throw new Error('Order is not found')
    }
    if (!ocoOrder) {
      this.logger.error(`unexpected: on-chain order is not found id:${orderId}`)
      throw new Error('On-chain order is not found')
    }

    const [user] = await Promise.all([this.userEntityService.getOne({ id: order.userId })])
    if (!user) {
      this.logger.error(`unexpected: user associated to the order is not found id:${order.userId}`)
      throw new Error('User is not found')
    }

    const details = await this.getActivityDetails(ocoOrder.type, ocoOrder)
    const activity = await this.activityEntityService.addOne({
      orderId: order.id,
      orderReferenceNumber: order.referenceNumber,
      amount: 0,
      amountUsdc: ocoOrder.amountUsdc,
      type: ActivityType.OnChain,
      comment: 'v1',
      details: details,
      userId: order.userId,
    })

    await this.activityStatusEntityService.addOne({
      activityId: activity.id,
      status: OnChainOrderActivityStatus.Pending,
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
      status: OnChainOrderActivityStatus.Completed,
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
      status: OnChainOrderActivityStatus.Failed,
      statusReason: reason ?? '',
      statusDatetime: ts,
    })

    await this.syncActivityStatus(activity)
  }

  private async syncActivityStatus(activity: ActivityModel): Promise<void> {
    const user = await this.userEntityService.getOne({ id: activity.userId })
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

  private async getActivityDetails(
    type: OnChainOrderType,
    onChainOrder: OnChainOrderModel,
  ): Promise<IOnChainOrderDetails> {
    switch (type) {
      case OnChainOrderType.Receive:
        return {
          type: ActivityType.OnChain,
          orderType: OnChainOrderType.Receive,

          coin: onChainOrder.coin,
          baseCoin: onChainOrder.baseCoin,

          fromAddress: onChainOrder.fromAddress,
          toAddress: onChainOrder.toAddress,

          fee: onChainOrder.fee,
        }
      case OnChainOrderType.Send: {
        const ocoFees = await this.onChainOrderFeeEntityService.getOne({ orderId: onChainOrder.orderId })
        let fees: IOnChainFeeResult | null = null
        if (!ocoFees) {
          this.logger.error(`unexpected: on chain order fees not found for send order with id ${onChainOrder.orderId}`)
        } else {
          fees = {
            neobankFeeUsdc: ocoFees.neobankFeeUsdc,
            networkFeeUsdc: ocoFees.networkFeeUsdc,
            totalFeeUsdc: ocoFees.totalFeeUsdc,
          }
        }

        return {
          type: ActivityType.OnChain,
          orderType: OnChainOrderType.Send,

          coin: onChainOrder.coin,
          baseCoin: onChainOrder.baseCoin,

          fromAddress: onChainOrder.fromAddress,
          toAddress: onChainOrder.toAddress,

          fee: onChainOrder.fee,
          fees: fees,

          totalUsdc: onChainOrder.totalUsdc,
        }
      }
    }
  }
}
