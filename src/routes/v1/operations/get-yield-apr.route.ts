2021

import { inject } from 'inversify'

import { BadRequestError, httpGet, requestParam, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { toDate } from 'date-fns-tz'

import { YieldAprOutput } from '../../../models/response'
import { UtcDate } from '../../../models/request/params/utc-date'
import { OperationsAudience } from '../../../models/config'

import { OperationsAccessMiddlewareFactory } from '../../../middleware/access/operations-access.middleware'

import { IYieldAprService, YieldAprServiceSymbol } from '../../../services/yield-apr.service'

@httpGet(
  '/api/v1/operations/yield/apr/:date',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.YieldProcessor }),
)
export class GetYieldAprRoute extends Route {
  @inject(YieldAprServiceSymbol) yieldAprService!: IYieldAprService

  @OpenApiOperationGet({
    path: '/api/v1/operations/yield/apr/{date}',
    description: 'Get yield APR for date',
    summary: 'GET yield APR for date',
    security: [{ OperationsToken: [] }],
    request: { path: { date: UtcDate } },
    responses: {
      [StatusCode.Success]: { description: 'Yield APR', content: YieldAprOutput },
      [StatusCode.BadRequest]: { description: 'Invalid request parameters' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestParam('date') date: string): Promise<void> {
    if (!date) {
      throw new BadRequestError('Invalid request parameters')
    }

    const effectiveDate = toDate(date, { timeZone: 'UTC' })
    if (isNaN(effectiveDate.getTime())) {
      throw new BadRequestError('Invalid request parameters')
    }

    const yieldAprOutput = await this.yieldAprService.getAprForDate(effectiveDate)

    return this.json(yieldAprOutput, YieldAprOutput)
  }
}
