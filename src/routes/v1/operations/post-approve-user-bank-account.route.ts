2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { UnitOfWorkSymbol, IUnitOfWork } from '@ts-awesome/entity'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import { ApproveUserBankAccountInput } from '../../../models/request'
import { OperationsAudience } from '../../../models/config'

import { OperationsAccessMiddlewareFactory } from '../../../middleware/access/operations-access.middleware'
import { IUserBankAccountService, UserBankAccountServiceSymbol } from '../../../services/user-bank-account.service'

@httpPost(
  '/api/v1/operations/user/bank-account',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }),
)
export class PostApproveUserBankAccountRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(UserBankAccountServiceSymbol) userBankAccountService!: IUserBankAccountService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostApproveUserBankAccountRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/operations/user/bank-account',
    description: `Allows operations to add a bank account for a user regardless of the name matching logic results.`,
    summary: `POST Add operations-approved bank account for user.`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: ApproveUserBankAccountInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'The bank account was added successfully' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(ApproveUserBankAccountInput) body: ApproveUserBankAccountInput): Promise<void> {
    try {
      await this.uow.auto(() =>
        this.userBankAccountService.addUserBankAccountFromLog(
          body.bankNameMatchLogId,
          `${OperationsAudience.Retool}:${body.agentId}`,
        ),
      )
    } catch (err: any) {
      throw new BadRequestError(err.message)
    }

    return this.empty(StatusCode.NoContent)
  }
}
