2021

import { inject } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { BadRequestError } from '../../../../errors'

import { ApplicantPendingWebhookInput, SumsubWebhookType } from '../../../../models/webhooks/sumsub'

import { ISumsubWebhookService, SumsubWebhookServiceSymbol } from '../../../../services/webhooks/sumsub.webhook.service'

@httpPost('/api/v1/webhook/sumsub/applicant/pending')
export class ApplicantPendingWebhookRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(SumsubWebhookServiceSymbol) sumsubWebhookService!: ISumsubWebhookService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(ApplicantPendingWebhookRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/webhook/sumsub/applicant/pending',
    description: 'Pending applicant webhook - Applicant submitted all info/documents to Sumsub',
    summary: 'Pending applicant webhook - Applicant submitted all info/documents to Sumsub',
    security: [{ WebhookToken: [] }],
    request: {
      path: {},
      body: {
        required: true,
        schema: ApplicantPendingWebhookInput,
      },
    },
    responses: {
      [StatusCode.Accepted]: { description: 'Webhook call was resolved' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(ApplicantPendingWebhookInput) body: ApplicantPendingWebhookInput): Promise<void> {
    try {
      this.logger.info(
        `Received Sumsub Applicant Pending Webhook. User ID: ${body.externalUserId} Applicant ID: ${body.applicantId} Level Name: ${body.levelName}`,
      )

      if (body.type !== SumsubWebhookType.ApplicantPending) {
        throw new BadRequestError(
          `Received incorrect Sumsub webhook type. Type expected: ${SumsubWebhookType.ApplicantPending} Type received: ${body.type}`,
        )
      }

      await this.uow.auto(() => this.sumsubWebhookService.resolveApplicantPendingWebhook(body))
    } catch (err: any) {
      this.logger.error(err)
    }

    return this.empty(StatusCode.Accepted)
  }
}
