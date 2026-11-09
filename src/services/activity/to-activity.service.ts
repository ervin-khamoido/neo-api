import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { inject, injectable } from 'inversify'

import { FirestoreActivityServiceSymbol, IFirestoreActivityService } from './firestore-activity.service'
import {
  ActivityEntityServiceSymbol,
  ActivityStatusEntityServiceSymbol,
  ActivityType,
  IActivityEntityService,
  IActivityStatusEntityService,
  IOrderStatusEntityService,
  IUserDetailsEntityService,
  IUserEntityService,
  IUserWalletEntityService,
  OrderModel,
  OrderStatusEntityServiceSymbol,
  OrderStatusModel,
  TransferOrderActivityStatus,
  TransferOrderModel,
  TransferOrderStatus,
  UserDetailsEntityServiceSymbol,
  UserDetailsModel,
  UserEntityServiceSymbol,
  UserModel,
  UserWalletEntityServiceSymbol,
} from '../../models/db'

export interface ITOActivityService {
  createActivity(order: OrderModel, toOrder: TransferOrderModel, ts?: Date): Promise<void>
}

export const TOActivityServiceSymbol = Symbol.for('ITOActivityService')

@injectable()
export class TOActivityService implements ITOActivityService {
  @inject(ActivityEntityServiceSymbol) activityEntityService!: IActivityEntityService
  @inject(ActivityStatusEntityServiceSymbol) activityStatusEntityService!: IActivityStatusEntityService
  @inject(FirestoreActivityServiceSymbol) firestoreActivityService!: IFirestoreActivityService

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserWalletEntityServiceSymbol) userWalletEntityService!: IUserWalletEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusService!: IOrderStatusEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(TOActivityService)
  }

  async createActivity(order: OrderModel, toOrder: TransferOrderModel, ts: Date = new Date()): Promise<void> {
    const senderId = toOrder.fromUserId
    const receiverId = toOrder.toUserId

    const [users, userDetails, orderStatus] = await Promise.all([
      this.userEntityService.get(x => x.id.in([senderId, receiverId])),
      this.userDetailsEntityService.get(x => x.userId.in([senderId, receiverId])),
      this.orderStatusService.getOne({ orderId: order.id }),
    ])

    const sender = users.find(x => x.id === senderId)
    const senderDetails = userDetails.find(x => x.userId === senderId)

    const receiver = users.find(x => x.id === receiverId)
    const receiverDetails = userDetails.find(x => x.userId === receiverId)

    if (!sender || !senderDetails) {
      throw new Error(`createActivity(): user details for a sender not found. order ${order.uid}`)
    }

    if (!receiver || !receiverDetails) {
      throw new Error(`createActivity(): user or user details for a receiver not found. order ${order.uid}`)
    }

    if (!orderStatus) {
      throw new Error(`createActivity(): status of a transfer order is not found. order ${order.uid}`)
    }

    switch (orderStatus.status as TransferOrderStatus) {
      case TransferOrderStatus.Created:
        //
        break
      case TransferOrderStatus.Completed:
        await this.createCompletedActivity(
          { order, toOrder, sender, senderDetails, receiver, receiverDetails, orderStatus },
          ts,
        )
        break
      case TransferOrderStatus.Failed:
        // QQ: DO WE NEED TO CREATE A FAIL ORDER ACTIVITY?
        await this.createFailedActivity(
          { order, toOrder, sender, senderDetails, receiver, receiverDetails, orderStatus },
          ts,
        )
        break
    }
  }

  private async createCompletedActivity(payload: CreateActivityPayload, ts: Date) {
    const { order, toOrder, receiver, receiverDetails, sender, senderDetails } = payload

    const [senderActivity, receiverActivity] = await Promise.all([
      this.activityEntityService.addOne({
        orderId: order.id,
        orderReferenceNumber: order.referenceNumber,
        amount: toOrder.amount ?? 0,
        amountUsdc: toOrder.amountUsdc,
        type: ActivityType.Transfer_Send,
        comment: 'v1',
        details: {
          type: ActivityType.Transfer_Send,
          receiver: receiver.uid,
          receiverUsername: receiverDetails.username ?? 'anonym',
          receiverDisplayName: [receiverDetails.firstName, receiverDetails.lastName].join(' '),
          // TODO: change when design is available
          title: 'Money Transfer',
          // description: ''
        },
        userId: sender.id,
      }),
      this.activityEntityService.addOne({
        orderId: order.id,
        orderReferenceNumber: order.referenceNumber,
        amount: toOrder.amount ?? 0,
        amountUsdc: toOrder.amountUsdc,
        type: ActivityType.Transfer_Receive,
        comment: 'v1',
        details: {
          type: ActivityType.Transfer_Receive,
          // why do we need any user uids here?
          sender: sender.uid,
          senderUsername: senderDetails.username ?? 'anonym',
          senderDisplayName: [senderDetails.firstName, senderDetails.lastName].join(' '),
          // TODO: change when design is available
          title: 'Money Transfer',
          // description: ''
        },
        userId: receiver.id,
      }),
    ])

    await Promise.all([
      this.activityStatusEntityService.addOne({
        activityId: senderActivity.id,
        status: TransferOrderActivityStatus.Completed,
        statusReason: '',
        statusDatetime: ts,
      }),
      this.activityStatusEntityService.addOne({
        activityId: receiverActivity.id,
        status: TransferOrderActivityStatus.Completed,
        statusReason: '',
        statusDatetime: ts,
      }),
    ])

    // NOTE: we will loose the DB records if firestoreActivityService fails
    await Promise.all([
      this.firestoreActivityService.publishActivity(sender.fireUserId, senderActivity),
      this.firestoreActivityService.publishActivity(receiver.fireUserId, receiverActivity),
    ])
  }

  private async createFailedActivity(payload: CreateActivityPayload, ts: Date) {
    const { order, toOrder, receiver, receiverDetails, sender, orderStatus } = payload

    const senderActivity = await this.activityEntityService.addOne({
      orderId: order.id,
      orderReferenceNumber: order.referenceNumber,
      amount: toOrder.amount ?? 0,
      amountUsdc: toOrder.amountUsdc,
      type: ActivityType.Transfer_Send,
      comment: 'v1',
      details: {
        type: ActivityType.Transfer_Send,
        receiver: receiver.uid,
        receiverUsername: receiverDetails.username ?? 'anonym',
        receiverDisplayName: [receiverDetails.firstName, receiverDetails.lastName].join(' '),
        // TODO: change when design is available
        title: 'Money Transfer',
        // description: ''
      },
      userId: sender.id,
    })

    await this.activityStatusEntityService.addOne({
      activityId: senderActivity.id,
      status: TransferOrderActivityStatus.Failed,
      statusReason: orderStatus.statusReason,
      statusDatetime: ts,
    })

    await this.firestoreActivityService.publishActivity(sender.fireUserId, senderActivity)
  }
}

type CreateActivityPayload = {
  order: OrderModel
  toOrder: TransferOrderModel
  orderStatus: OrderStatusModel

  receiver: UserModel
  receiverDetails: UserDetailsModel

  sender: UserModel
  senderDetails: UserDetailsModel
}
