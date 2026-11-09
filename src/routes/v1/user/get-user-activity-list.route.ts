2023

import { inject } from 'inversify'

import { BadRequestError, httpGet, NotFoundError, queryParam, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'
import { desc, of } from '@ts-awesome/orm'

import { isNil } from 'lodash'

import {
  ActivityEntityServiceSymbol,
  ActivityModel,
  ActivityStatusEntityServiceSymbol,
  ActivityType,
  IActivityEntityService,
  IActivityStatusEntityService,
  IOrderEntityService,
  OrderEntityServiceSymbol,
  RewardOrderModel,
  RewardType,
  UserModel,
} from '../../../models/db'
import { ActivityOutput } from '../../../models/response/activity.output'
import { ActivityListOutput } from '../../../models/response'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'
import { CurrentUserSymbol } from '../../../middleware'

@httpGet('/api/v1/user/activity/list', FireAccessMiddleware(), PinAccessMiddleware)
export class GetUserActivityListRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(ActivityEntityServiceSymbol) activityEntityService!: IActivityEntityService
  @inject(ActivityStatusEntityServiceSymbol) activityStatusService!: IActivityStatusEntityService

  @OpenApiOperationGet({
    path: '/api/v1/user/activity/list',
    description: 'Get a list of user activity records by activity type',
    summary: 'GET a list of user activity records by activity type',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      query: {
        type: {
          description: 'Activity Type',
          required: true,
          schema: {
            type: 'string',
          },
        },
        rewardType: {
          description: 'Reward activity type - specific sub type for reward activities',
          schema: {
            type: 'string',
          },
        },
        cursor: {
          description: 'Cursor',
          schema: {
            type: 'number',
          },
        },
        pageSize: {
          description: 'Page size',
          schema: {
            type: 'number',
          },
        },
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'User activities list', content: ActivityListOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(
    @queryParam('type', String) type: ActivityType,
    @queryParam('rewardType', String) rewardType?: RewardType,
    @queryParam('cursor', Number) cursor?: number,
    @queryParam('pageSize', Number) pageSize?: number,
  ): Promise<void> {
    if (cursor && cursor < 0) {
      throw new BadRequestError('Cursor must be a positive number.')
    }

    if (pageSize && pageSize < 1) {
      throw new BadRequestError('Page size must be a positive number.')
    }

    if (pageSize && pageSize > 50) {
      throw new BadRequestError('Page size cannot exceed 50.')
    }

    const limit = pageSize ?? 10

    const output = await this.getActivityListOutput(type, limit, cursor, rewardType)

    return this.json(output, ActivityListOutput)
  }

  async getActivityListOutput(
    activityType: ActivityType,
    limit: number,
    cursor?: number,
    rewardType?: RewardType,
  ): Promise<ActivityListOutput> {
    const activitiesQuery = this.activityEntityService
      .select()
      .where(x => x.userId.eq(this.user.id))
      .where(x => x.type.eq(activityType))

    if (!isNil(rewardType) && activityType === ActivityType.Reward) {
      activitiesQuery
        .join(RewardOrderModel, (root, other) => root.orderId.eq(other.orderId))
        .where(() => of(RewardOrderModel, 'rewardType').eq(rewardType))
    }

    if (!isNil(cursor)) {
      activitiesQuery.where(x => x.id.lte(cursor))
    }

    const queryResults = await activitiesQuery
      .orderBy(x => [desc(x.id)])
      .limit(limit + 1) // Grab an extra to get the next cursor value
      .fetch(ActivityModel)

    // Get the last activity for the next cursor
    const results = [...queryResults]

    // Only pop the last record if greater than the limit
    const nextActivity = results.length > limit ? results.pop() : null

    // Get the activity details for the remaining activities
    const activities: ActivityOutput[] = []
    for (const activity of results) {
      const activityStatuses = await this.activityStatusService.get({ activityId: activity.id })
      let currentStatus = null
      if (activityStatuses.length) {
        currentStatus = activityStatuses[activityStatuses.length - 1].status
      }

      const order = await this.orderEntityService.getOne({ id: activity.orderId })

      const result: ActivityOutput = {
        ...activity,
        order: order!.uid,
        status: currentStatus,
        statuses: activityStatuses.map(x => ({ ...x })),
      }

      activities.push(result)
    }

    return { nextCursor: nextActivity?.id ?? null, pageSize: limit, activities: activities }
  }
}
