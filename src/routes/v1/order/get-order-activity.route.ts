2021

import { inject } from 'inversify'

import { httpGet, NotFoundError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentOrderSymbol, CurrentUserSymbol } from '../../../middleware'
import {
  ActivityEntityServiceSymbol,
  ActivityStatusEntityServiceSymbol,
  IActivityEntityService,
  IActivityStatusEntityService,
  OrderModel,
  UserModel,
} from '../../../models/db'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { OrderAccessMiddleware } from '../../../middleware/access/order-access.middleware'
import { UID } from '../../../models/openapi'
import { ActivityOutput } from '../../../models/response/activity.output'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

@httpGet('/api/v1/order/:order/activity', FireAccessMiddleware(), PinAccessMiddleware, OrderAccessMiddleware)
export class GetOrderActivityRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel
  @inject(CurrentOrderSymbol) order!: OrderModel

  @inject(ActivityEntityServiceSymbol) activityEntityService!: IActivityEntityService
  @inject(ActivityStatusEntityServiceSymbol) activityStatusService!: IActivityStatusEntityService

  @OpenApiOperationGet({
    path: '/api/v1/order/{order}/activity',
    description: 'Get order activity',
    summary: 'GET order activity',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      path: { order: UID },
    },
    responses: {
      [StatusCode.Success]: { description: 'Order activity', content: ActivityOutput },
      [StatusCode.PreconditionFailed]: { description: 'Internal error' },
      [StatusCode.Forbidden]: { description: 'Access to this activity is forbidden' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const activity = await this.activityEntityService.getOne({ orderId: this.order.id })
    if (!activity) {
      throw new NotFoundError('Activity for the order with such UID is not found')
    }

    const activityStatuses = await this.activityStatusService.get({ activityId: activity.id })
    let currentStatus = null
    if (activityStatuses.length) {
      currentStatus = activityStatuses[activityStatuses.length - 1].status
    }

    const result: ActivityOutput = {
      ...activity,
      order: this.order.uid,
      status: currentStatus,
      statuses: activityStatuses.map(x => ({ ...x })),
    }

    return this.json(result, ActivityOutput)
  }
}
