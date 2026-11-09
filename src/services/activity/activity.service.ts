2021

import { inject, injectable } from 'inversify'
import { firestore } from 'firebase-admin'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import read from '@ts-awesome/model-reader'
import { asc } from '@ts-awesome/orm'

import {
  ActivityEntityServiceSymbol,
  ActivityModel,
  ActivityStatus,
  ActivityStatusEntityServiceSymbol,
  ActivityStatusModel,
  ActivityType,
  IActivityEntityService,
  IActivityRewardDetails,
  IActivityStatusEntityService,
  IOrderEntityService,
  IOrderStatusEntityService,
  IPurchaseOrderEntityService,
  IUserBankAccountEntityService,
  IUserEntityService,
  IYieldOrderDetails,
  OrderEntityServiceSymbol,
  OrderModel,
  OrderStatusEntityServiceSymbol,
  PurchaseOrderActivityStatus,
  PurchaseOrderEntityServiceSymbol,
  PurchaseOrderModel,
  PurchaseOrderStatus,
  PurchaseOrderStatusReason,
  RewardOrderActivityStatus,
  RewardOrderModel,
  RewardType,
  SellOrderActivityStatus,
  SellOrderModel,
  SellOrderStatus,
  SellOrderStatusReason,
  TransactionMode,
  UserBankAccountEntityServiceSymbol,
  UserEntityServiceSymbol,
  UserModel,
  YieldOrderActivityStatus,
  YieldOrderModel,
} from '../../models/db'

import { ActivityOutput, ActivityStatusOutput } from '../../models/response/activity.output'
import { addMonths, getMonth } from 'date-fns'

export interface IActivityService {
  createPOActivity(
    user: UserModel,
    order: OrderModel,
    poOrder: PurchaseOrderModel,
    transMode: TransactionMode,
    ts?: Date,
  ): Promise<void>
  updatePOActivity(
    orderId: number,
    orderStatus: PurchaseOrderStatus,
    statusReason: PurchaseOrderStatusReason,
    fireUserId?: string,
    ts?: Date,
  ): Promise<void>
  cancelPOActivity(orderId: number, statusReason: string, fireUserId?: string, ts?: Date): Promise<void>
  createSOActivity(user: UserModel, order: OrderModel, soOrder: SellOrderModel, ts?: Date): Promise<void>
  updateSOActivity(
    orderId: number,
    orderStatus: SellOrderStatus,
    statusReason: SellOrderStatusReason,
    fireUserId?: string,
    ts?: Date,
  ): Promise<void>
  createYOActivity(user: UserModel, order: OrderModel, yoOrder: YieldOrderModel, ts?: Date): Promise<void>
  createROActivity(user: UserModel, order: OrderModel, roOrder: RewardOrderModel, ts?: Date): Promise<void>
}

export const ActivityServiceSymbol = Symbol.for('IActivityService')

@injectable()
export class ActivityService implements IActivityService {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(ActivityEntityServiceSymbol) activityEntityService!: IActivityEntityService
  @inject(ActivityStatusEntityServiceSymbol) activityStatusService!: IActivityStatusEntityService

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserBankAccountEntityServiceSymbol) userBankAccount!: IUserBankAccountEntityService
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(PurchaseOrderEntityServiceSymbol) purchaseEntityService!: IPurchaseOrderEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusService!: IOrderStatusEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(ActivityService)
  }

  async createPOActivity(
    user: UserModel,
    order: OrderModel,
    poOrder: PurchaseOrderModel,
    transMode: TransactionMode,
    ts?: Date,
  ): Promise<void> {
    ts = ts ?? new Date()

    const bankAccount = await this.userBankAccount.getOne({ id: poOrder.userBankAccountId })
    const activity = await this.activityEntityService.addOne({
      orderId: order.id,
      orderReferenceNumber: order.referenceNumber,
      amount: poOrder.total,
      amountUsdc: poOrder.totalUsdc,
      type: ActivityType.Buy,
      comment: 'v1',
      details: {
        type: ActivityType.Buy,
        transactionMode: transMode,
        userBankAccountNumber: bankAccount!.bankAccountNumberPublic,
        amount: poOrder.amount,
        exchangeRate: poOrder.exchangeRate,
        fee: poOrder.feeTotal,
      },
      userId: user.id,
    })

    const initialActivityStatus = await this.activityStatusService.addOne({
      activityId: activity.id,
      status: PurchaseOrderActivityStatus.NewPurchase,
      statusReason: '',
      statusDatetime: ts,
    })

    await this.publishActivityToFS(user.fireUserId, order.uid, activity, initialActivityStatus)
  }

  async updatePOActivity(
    orderId: number,
    orderStatus: PurchaseOrderStatus,
    statusReason: PurchaseOrderStatusReason,
    fireUserId?: string,
    ts?: Date,
  ): Promise<void> {
    const activity = await this.activityEntityService.getOne({ orderId: orderId })

    if (!fireUserId) {
      const user = await this.userEntityService.getOne({ id: activity?.userId })
      fireUserId = user?.fireUserId
    }

    const newActivityStatuses = PurchaseOrderToActivityStatus[orderStatus]
    const activityStatusList = await this.activityStatusService
      .select()
      .where(x => x.activityId.eq(activity!.id))
      .where(x => x.status.in(newActivityStatuses))
      .fetch(ActivityStatusModel)

    if (activityStatusList.length) {
      // activity status table already contains these status(-es)
      return
    }

    await this.activityStatusService.add(
      newActivityStatuses.map(x => ({
        activityId: activity!.id,
        status: x,
        statusReason: statusReason,
        statusDatetime: ts ?? new Date(),
      })),
    )

    await this.pushStatusToFS(fireUserId!, activity!)
  }

  async cancelPOActivity(orderId: number, statusReason: string, fireUserId?: string, ts?: Date): Promise<void> {
    const activity = await this.activityEntityService.getOne({ orderId: orderId })

    if (!fireUserId) {
      const user = await this.userEntityService.getOne({ id: activity?.userId })
      fireUserId = user?.fireUserId
    }

    const newActivityStatuses = PurchaseOrderToActivityStatus[PurchaseOrderStatus.Cancelled]
    const activityStatusList = await this.activityStatusService
      .select()
      .where(x => x.activityId.eq(activity!.id))
      .where(x => x.status.in(newActivityStatuses))
      .fetch(ActivityStatusModel)

    if (activityStatusList.length) {
      // activity status table already contains these status(-es)
      return
    }

    await this.activityStatusService.add(
      newActivityStatuses.map(x => ({
        activityId: activity!.id,
        status: x,
        statusReason: statusReason,
        statusDatetime: ts ?? new Date(),
      })),
    )

    await this.deleteFromFS(fireUserId!, activity!)
  }

  async createSOActivity(user: UserModel, order: OrderModel, soOrder: SellOrderModel, ts?: Date): Promise<void> {
    ts = ts ?? new Date()

    const bankAccount = await this.userBankAccount.getOne({ id: soOrder.userBankAccountId })

    const activity = await this.activityEntityService.addOne({
      orderId: order.id,
      orderReferenceNumber: order.referenceNumber,
      amount: soOrder.total,
      amountUsdc: soOrder.totalUsdc,
      type: ActivityType.Sell,
      comment: 'v1',
      details: {
        type: ActivityType.Sell,
        userBankAccountNumber: bankAccount!.bankAccountNumberPublic,
        amount: soOrder.amount,
        amountUsdc: soOrder.amountUsdc,
        exchangeRate: soOrder.exchangeRate,
        fee: soOrder.feeTotal,
      },
      userId: user.id,
    })

    const initialActivityStatus = await this.activityStatusService.addOne({
      activityId: activity.id,
      status: SellOrderActivityStatus.OrderPlaced,
      statusReason: '',
      statusDatetime: ts,
    })

    await this.publishActivityToFS(user.fireUserId, order.uid, activity, initialActivityStatus)
  }

  async updateSOActivity(
    orderId: number,
    orderStatus: SellOrderStatus,
    statusReason: SellOrderStatusReason,
    fireUserId?: string,
    ts?: Date,
  ): Promise<void> {
    const activity = await this.activityEntityService.getOne({ orderId: orderId })

    if (!fireUserId) {
      const user = await this.userEntityService.getOne({ id: activity?.userId })
      fireUserId = user?.fireUserId
    }

    const newActivityStatuses = SellOrderToActivityStatus[orderStatus]
    const activityStatusList = await this.activityStatusService
      .select()
      .where(x => x.activityId.eq(activity!.id))
      .where(x => x.status.in(newActivityStatuses))
      .fetch(ActivityStatusModel)

    if (activityStatusList.length) {
      // activity status table already contains these status(-es)
      return
    }

    await this.activityStatusService.add(
      newActivityStatuses.map(x => ({
        activityId: activity!.id,
        status: x,
        statusReason: statusReason,
        statusDatetime: ts ?? new Date(),
      })),
    )

    await this.pushStatusToFS(fireUserId!, activity!)
  }

  async createYOActivity(user: UserModel, order: OrderModel, yoOrder: YieldOrderModel, ts?: Date): Promise<void> {
    ts = ts ?? new Date()

    const activity = await this.activityEntityService.addOne({
      orderId: order.id,
      orderReferenceNumber: order.referenceNumber,
      amount: yoOrder.amount,
      amountUsdc: yoOrder.amountUsdc,
      type: ActivityType.Yield,
      comment: 'v1',
      details: <IYieldOrderDetails>{
        type: ActivityType.Yield,
        subType: 'month',
        credited: yoOrder.createdAt,
        month: getMonth(addMonths(yoOrder.startPeriod, 1)),
        yieldMonth: getMonth(yoOrder.startPeriod),
        period: {
          start: yoOrder.startPeriod,
          end: yoOrder.endPeriod,
        },
        averageInterestRate: yoOrder.averageInterestRate,
      },
      userId: user.id,
    })

    const initialActivityStatus = await this.activityStatusService.addOne({
      activityId: activity.id,
      status: YieldOrderActivityStatus.Completed,
      statusReason: '',
      statusDatetime: ts,
    })

    await this.publishActivityToFS(user.fireUserId, order.uid, activity, initialActivityStatus)
  }

  async createROActivity(user: UserModel, order: OrderModel, roOrder: RewardOrderModel, ts?: Date): Promise<void> {
    ts = ts ?? new Date()

    const a: keyof this = 'uow'

    const rewardOrderDetails = this.getActivityRewardDetail(roOrder)
    const activity = await this.activityEntityService.addOne({
      orderId: order.id,
      orderReferenceNumber: order.referenceNumber,
      amount: roOrder.amount,
      amountUsdc: roOrder.amountUsdc,
      type: ActivityType.Reward,
      comment: 'v1',
      details: {
        type: ActivityType.Reward,
        rewardType: roOrder.rewardType,
        title: roOrder.title,
        credited: roOrder.createdAt,
        description: roOrder.description,
        exchangeRate: roOrder.exchangeRate,
        details: rewardOrderDetails,
      },
      userId: user.id,
    })

    const initialActivityStatus = await this.activityStatusService.addOne({
      activityId: activity.id,
      status: RewardOrderActivityStatus.Completed,
      statusReason: '',
      statusDatetime: ts,
    })

    await this.publishActivityToFS(user.fireUserId, order.uid, activity, initialActivityStatus)
  }

  private getActivityRewardDetail(roOrder: RewardOrderModel): IActivityRewardDetails | null {
    switch (roOrder.details.type) {
      case RewardType.Cashback_Buy: {
        return {
          rewardType: RewardType.Cashback_Buy,
          percentage: roOrder.details.calculatedWinAmountPercentage,
          totalUsdc: roOrder.details.totalUsdc,
          amount: roOrder.details.amount,
          cashbackUsdc: roOrder.details.cashbackUsdc,
          version: 'v1',
        }
      }
      case RewardType.Referral_Referrer: {
        return {
          rewardType: RewardType.Referral_Referrer,
          version: 'v1',
          referrerPayoutsCount: roOrder.details.referrerPayoutsCount,
        }
      }
      case RewardType.Promotion_Campaign: {
        return {
          rewardType: RewardType.Promotion_Campaign,
          version: 'v1',
        }
      }
      default:
        return null
    }
  }

  private async publishActivityToFS(
    fireUserId: string,
    orderUid: string,
    actv: ActivityModel,
    initial: ActivityStatusModel,
  ) {
    const activityCollection = this.getActivityCollection(fireUserId, actv.type)
    const result = read(
      {
        ...actv,
        status: initial.status,
        order: orderUid,
        statuses: [initial],
      },
      ActivityOutput,
    )!

    const clone = JSON.parse(JSON.stringify(result))

    await firestore().collection(activityCollection).doc(actv.uid).set(clone)
  }

  private async pushStatusToFS(fireUserId: string, activity: ActivityModel) {
    const activityStatuses = await this.activityStatusService
      .select()
      .where({ activityId: activity.id })
      .orderBy(x => [asc(x.statusDatetime)])
      .fetch(ActivityStatusModel)

    const status = activityStatuses?.length ? activityStatuses[activityStatuses.length - 1].status : null

    const update = JSON.parse(
      JSON.stringify({ status: status, statuses: read([...activityStatuses], [ActivityStatusOutput]) }),
    )
    const activityCollection = this.getActivityCollection(fireUserId, activity.type)

    await firestore().collection(activityCollection).doc(activity.uid).update(update)
  }

  private async deleteFromFS(fireUserId: string, activity: ActivityModel) {
    const activityCollection = this.getActivityCollection(fireUserId, activity.type)

    await firestore().collection(activityCollection).doc(activity.uid).delete()
  }

  private getActivityCollection(fireUserId: string, type: ActivityType) {
    switch (type) {
      case ActivityType.Reward:
        return `user/${fireUserId}/activity-reward`
      default:
        return `user/${fireUserId}/activity`
    }
  }
}

const PurchaseOrderToActivityStatus: Record<PurchaseOrderStatus, ActivityStatus[]> = Object.freeze({
  [PurchaseOrderStatus.Created]: [PurchaseOrderActivityStatus.NewPurchase],
  [PurchaseOrderStatus.PaymentSent]: [
    PurchaseOrderActivityStatus.PaymentSent,
    PurchaseOrderActivityStatus.ConfirmingPayment,
  ],
  [PurchaseOrderStatus.Confirmed]: [
    PurchaseOrderActivityStatus.PaymentConfirmed,
    PurchaseOrderActivityStatus.ConvertingToUSDC,
  ],
  [PurchaseOrderStatus.Failed]: [
    PurchaseOrderActivityStatus.PaymentConfirmed,
    PurchaseOrderActivityStatus.ConvertingToUSDC,
  ],
  [PurchaseOrderStatus.CryptoCredited]: [PurchaseOrderActivityStatus.USDCDeposited],
  [PurchaseOrderStatus.Cancelled]: [PurchaseOrderActivityStatus.Cancelled],
  [PurchaseOrderStatus.PaymentNotReceived]: [PurchaseOrderActivityStatus.PaymentNotReceived],
  [PurchaseOrderStatus.Refunded]: [PurchaseOrderActivityStatus.Refunded],
})

const SellOrderToActivityStatus: Record<SellOrderStatus, ActivityStatus[]> = Object.freeze({
  [SellOrderStatus.Created]: [SellOrderActivityStatus.OrderPlaced],
  [SellOrderStatus.TransferFailed]: [SellOrderActivityStatus.OrderPlaced],
  [SellOrderStatus.CryptoTransferred]: [
    SellOrderActivityStatus.WithdrawingUSDC,
    SellOrderActivityStatus.ConvertingUSDC,
  ],
  [SellOrderStatus.PaymentSent]: [SellOrderActivityStatus.TransferringNGN, SellOrderActivityStatus.TransferSuccessful],
  [SellOrderStatus.PaymentConfirmedByUser]: [SellOrderActivityStatus.Completed],
  [SellOrderStatus.RefundInitiated]: [SellOrderActivityStatus.RefundingUSDC],
  [SellOrderStatus.RefundFailed]: [SellOrderActivityStatus.RefundingUSDC],
  [SellOrderStatus.Refunded]: [SellOrderActivityStatus.Cancelled],
  [SellOrderStatus.Cancelled]: [SellOrderActivityStatus.Cancelled],
})
