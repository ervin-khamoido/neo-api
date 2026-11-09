2021

import { inject } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { BadRequestError } from '../../../../errors'

import { ApplicantCreatedWebhookInput, SumsubWebhookType } from '../../../../models/webhooks/sumsub'

import { ISumsubWebhookService, SumsubWebhookServiceSymbol } from '../../../../services/webhooks/sumsub.webhook.service'

@httpPost('/api/v1/webhook/sumsub/applicant/created')
export class ApplicantCreatedWebhookRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(SumsubWebhookServiceSymbol) sumsubWebhookService!: ISumsubWebhookService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(ApplicantCreatedWebhookRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/webhook/sumsub/applicant/created',
    description: 'Create applicant webhook - Applicant started KYC process in Sumsub',
    summary: 'Create applicant webhook - Applicant started KYC process in Sumsub',
    security: [{ WebhookToken: [] }],
    request: {
      path: {},
      body: {
        required: true,
        schema: ApplicantCreatedWebhookInput,
      },
    },
    responses: {
      [StatusCode.Accepted]: { description: 'Webhook call was resolved' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(ApplicantCreatedWebhookInput) body: ApplicantCreatedWebhookInput): Promise<void> {
    try {
      this.logger.info(
        `Received Sumsub Applicant Created Webhook. User ID: ${body.externalUserId} Applicant ID: ${body.applicantId} Level Name: ${body.levelName}`,
      )

      if (body.type !== SumsubWebhookType.ApplicantCreated) {
        throw new BadRequestError(
          `Received incorrect Sumsub webhook type. Type expected: ${SumsubWebhookType.ApplicantCreated} Type received: ${body.type}`,
        )
      }

      await this.uow.auto(() => this.sumsubWebhookService.resolveApplicantCreatedWebhook(body))
    } catch (err: any) {
      this.logger.error(err)
    }

    return this.empty(StatusCode.Accepted)
  }
}
