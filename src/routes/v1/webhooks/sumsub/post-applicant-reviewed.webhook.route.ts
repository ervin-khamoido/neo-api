2021

import { inject } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { BadRequestError } from '../../../../errors'

import { ApplicantReviewedWebhookInput, SumsubWebhookType } from '../../../../models/webhooks/sumsub'

import { ISumsubWebhookService, SumsubWebhookServiceSymbol } from '../../../../services/webhooks/sumsub.webhook.service'

@httpPost('/api/v1/webhook/sumsub/applicant/reviewed')
export class ApplicantReviewedWebhookRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(SumsubWebhookServiceSymbol) sumsubWebhookService!: ISumsubWebhookService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(ApplicantReviewedWebhookRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/webhook/sumsub/applicant/reviewed',
    description:
      'Reviewed applicant webhook - Review of user identification complete by Sumsub or internal team member',
    summary: 'Reviewed applicant webhook - Review of user identification complete by Sumsub or internal team member',
    security: [{ WebhookToken: [] }],
    request: {
      path: {},
      body: {
        required: true,
        schema: ApplicantReviewedWebhookInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'Webhook call was resolved' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(ApplicantReviewedWebhookInput) body: ApplicantReviewedWebhookInput): Promise<void> {
    try {
      this.logger.info(
        `Received Sumsub Applicant Reviewed Webhook. User ID: ${body.externalUserId} Applicant ID: ${body.applicantId} Level Name: ${body.levelName}`,
      )

      if (body.type != SumsubWebhookType.ApplicantReviewed) {
        throw new BadRequestError(
          `Received incorrect Sumsub webhook type. Type expected: ${SumsubWebhookType.ApplicantReviewed} Type received: ${body.type}`,
        )
      }

      await this.uow.auto(() => this.sumsubWebhookService.resolveApplicantReviewedWebhook(body))
    } catch (err: any) {
      this.logger.error(err)
    }

    return this.empty(StatusCode.Accepted)
  }
}
