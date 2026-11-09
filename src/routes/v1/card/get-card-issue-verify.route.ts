2021

import { inject } from 'inversify'
import {httpGet, Route, StatusCode} from '@ts-awesome/rest'
import {OpenApiOperationGet} from '@ts-awesome/openapi'

import {CardIssueEligibilityOutput} from "../../../models/response/card-issue-eligibility-output";

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'

import {
  IVirtualCardBusinessService,
  VirtualCardBusinessServiceSymbol
} from "../../../services/business/card/virtual-card.business.service";
import {CurrentUserSymbol} from "../../../middleware";
import {UserModel} from "../../../models/db";
import {ILogger, ILoggerFactory, LoggerFactorySymbol} from "@ts-awesome/logger";

@httpGet('/api/v1/card/verify-card-issue', FireAccessMiddleware())
export class GetVirtualCardIssuanceVerificationRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(VirtualCardBusinessServiceSymbol) virtualCardBusinessService!: IVirtualCardBusinessService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(GetVirtualCardIssuanceVerificationRoute)
  }

  @OpenApiOperationGet({
    path: '/api/v1/card/verify-card-issue',
    description: 'Verifies a virtual card can be issued to the user',
    summary: 'GET Card Issuance Verification',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.OK]: { description: 'True if a user is eligible to issue the card otherwise false', content: CardIssueEligibilityOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    try {
      // Verify we can issue a virtual card to the user, will throw an err if not
      await this.virtualCardBusinessService.verifyVirtualCardCanBeIssuedToUser(this.user.id)

      return this.json({ result: true }, CardIssueEligibilityOutput)
    } catch (err: any) {
      this.logger.error(err)
      return this.json({ result: false, reason: err.message }, CardIssueEligibilityOutput)
    }
  }
}
