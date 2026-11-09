2021

import { inject, named } from 'inversify'
import { Queue } from 'bullmq'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { OperationsAccessMiddlewareFactory } from '../../../../middleware/access/operations-access.middleware'
import { OperationsAudience } from '../../../../models/config'
import { ReissueCardInput } from '../../../../models/request'
import { EventQueueSymbol } from '../../../../utils/event-queue'
import { ReportQueueEvent, ReportQueueName } from '../../../../microservice/reporting/common'
import { ReportEventData, ReportType } from '../../../../microservice/reporting/report-event.data'

@httpPost(
  '/api/v1/operations/reporting/balance',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }),
)
export class PostBalanceReportRoute extends Route {
  @inject(EventQueueSymbol) @named(ReportQueueName) queue!: Queue<ReportEventData>

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostBalanceReportRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/operations/reporting/balance',
    description: `Generate balance report`,
    summary: `Generate balance report`,
    security: [{ OperationsToken: [] }],
    request: {},
    responses: {
      [StatusCode.NoContent]: { description: 'Successfully scheduled report' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(ReissueCardInput) body: ReissueCardInput): Promise<void> {
    try {
      await this.queue.add(ReportQueueEvent.Report, { type: ReportType.Balance })
      this.logger.info(`scheduled balance report`)
    } catch (err: any) {
      // swallow the error
      this.logger.error(`critical: could not put a report event in the queue`)
      this.logger.error(err)
    }

    return this.empty(StatusCode.NoContent)
  }
}
