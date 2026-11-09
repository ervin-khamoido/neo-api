import { inject, injectable } from 'inversify'
import { firestore } from 'firebase-admin'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { asc } from '@ts-awesome/orm'
import read from '@ts-awesome/model-reader'

import {
  ActivityModel,
  ActivityStatusEntityServiceSymbol,
  ActivityStatusModel,
  ActivityType,
  IActivityStatusEntityService,
  IOrderEntityService,
  OrderEntityServiceSymbol,
} from '../../models/db'
import { ActivityOutput, ActivityStatusOutput } from '../../models/response/activity.output'

export interface IFirestoreActivityService {
  publishActivity(fireUserId: string, activity: ActivityModel): Promise<void>
  pushActivityStatus(fireUserId: string, activity: ActivityModel): Promise<void>
  deleteActivity(fireUserId: string, activity: ActivityModel): Promise<void>
}

export const FirestoreActivityServiceSymbol = Symbol.for('IFirestoreActivityService')

@injectable()
export class FirestoreActivityService implements IFirestoreActivityService {
  @inject(ActivityStatusEntityServiceSymbol) activityStatusService!: IActivityStatusEntityService

  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(FirestoreActivityService)
  }

  async publishActivity(fireUserId: string, activity: ActivityModel): Promise<void> {
    const [order, statuses] = await Promise.all([
      this.orderEntityService.getOne({ id: activity.orderId }),
      this.activityStatusService
        .select()
        .where({ activityId: activity.id })
        .orderBy(x => [x.createdAt])
        .fetch(ActivityStatusModel),
    ])

    const latestStatus = statuses[statuses.length - 1]
    const activityCollection = this.getActivityCollection(fireUserId, activity.type)
    const result = read(
      {
        ...activity,
        status: latestStatus.status,
        order: order!.uid,
        statuses: statuses,
      },
      ActivityOutput,
    )!
    const clone = this.clone(result)

    await firestore().collection(activityCollection).doc(activity.uid).set(clone)
  }

  async pushActivityStatus(fireUserId: string, activity: ActivityModel) {
    const activityStatuses = await this.activityStatusService
      .select()
      .where({ activityId: activity.id })
      .orderBy(x => [asc(x.statusDatetime)])
      .fetch(ActivityStatusModel)

    const status = activityStatuses?.length ? activityStatuses[activityStatuses.length - 1].status : null

    const update = this.clone({
      status: status,
      statuses: read([...activityStatuses], [ActivityStatusOutput]),
    })
    const activityCollection = this.getActivityCollection(fireUserId, activity.type)

    await firestore().collection(activityCollection).doc(activity.uid).update(update)
  }

  async deleteActivity(fireUserId: string, activity: ActivityModel): Promise<void> {
    const activityCollection = this.getActivityCollection(fireUserId, activity.type)

    await firestore().collection(activityCollection).doc(activity.uid).delete()
  }

  private getActivityCollection(fireUserId: string, type: ActivityType) {
    switch (type) {
      case ActivityType.Transfer_Receive:
      case ActivityType.Transfer_Send:
        return `user/${fireUserId}/activity-transfer`
      case ActivityType.Reward:
        return `user/${fireUserId}/activity-reward`
      case ActivityType.Card:
        return `user/${fireUserId}/activity-card`
      case ActivityType.OnChain:
        return `user/${fireUserId}/activity-on-chain`
      default:
        return `user/${fireUserId}/activity`
    }
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }
}
