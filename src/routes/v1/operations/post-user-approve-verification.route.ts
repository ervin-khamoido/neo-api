2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, NotFoundError, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPatch } from '@ts-awesome/openapi'
import { UnitOfWorkSymbol, IUnitOfWork } from '@ts-awesome/entity'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import { ApproveUserVerificationInput } from '../../../models/request'
import {
  UserEntityServiceSymbol,
  IUserEntityService,
  IUserKYCProviderVerificationEntityService,
  UserKYCProviderVerificationEntityServiceSymbol,
  UserModel,
  IKYCLevelEntityService,
  KYCLevelEntityServiceSymbol,
  KYCProviderApplicationStatus,
  UserStatus,
  IUserDetailsEntityService,
  UserDetailsEntityServiceSymbol,
} from '../../../models/db'
import { OperationsAudience } from '../../../models/config'

import { OperationsAccessMiddlewareFactory } from '../../../middleware/access/operations-access.middleware'
import {
  IUserAccountManagementService,
  UserAccountManagementServiceSymbol,
} from '../../../services/user-account-management.service'
import { IUserLevelService, UserLevelServiceSymbol } from '../../../services/level/user-level.service'
import { SUMSUB_WEBHOOK_UPDATED_BY } from '../../../services/webhooks/sumsub.webhook.service'
import { KYCStatusReasonCode } from '../../../services/kyc/kyc-level-processor'

@httpPost(
  '/api/v1/operations/user/verification/level-2/approve',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }),
)
export class PostUserApproveVerificationRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(UserAccountManagementServiceSymbol) userAccountManagementService!: IUserAccountManagementService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserKYCProviderVerificationEntityServiceSymbol)
  userKYCProviderVerificationEntityService!: IUserKYCProviderVerificationEntityService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService
  @inject(KYCLevelEntityServiceSymbol) kycLevelEntityService!: IKYCLevelEntityService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostUserApproveVerificationRoute)
  }

  @OpenApiOperationPatch({
    path: '/api/v1/operations/user/verification/level-2/approve',
    description: `Approve user level verification that did not pass Name matching`,
    summary: `POST Approve the user verification for level 2`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: ApproveUserVerificationInput,
      },
    },
    responses: {
      [StatusCode.NoContent]: { description: 'The verification was approved successfully' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.NotFound]: { description: 'User not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(ApproveUserVerificationInput) body: ApproveUserVerificationInput): Promise<void> {
    const user = await this.userEntityService.getOne({ uid: body.user })
    if (!user) {
      throw new NotFoundError('User not found')
    }

    try {
      const kycLevel = await this.kycLevelEntityService.getOne({ providerLevelName: body.providerLevelName })
      if (!kycLevel) {
        throw new Error(`unexpected: the kyc level with provider level name (${body.providerLevelName}) does not exist`)
      }

      const userLevel = await this.userLevelService.getUserLevelByKYCLevelId(kycLevel.id)
      if (!userLevel) {
        throw new Error(`unexpected: user level with kyc level id (${kycLevel.id}) does not exist`)
      }

      const updatedBy = `${OperationsAudience.Retool}:${body.agentId}`

      await this.uow.auto(() => this.approveRejectedVerification(user, body, updatedBy))
      await this.uow.auto(() => this.tryUnblockingUser(user, body, updatedBy))
      await this.uow.auto(() => this.userLevelService.triggerLevelPromotion(user.id, userLevel.code))
    } catch (err: any) {
      this.logger.error(err, user.uid)

      throw new BadRequestError(err.message)
    }

    return this.empty(StatusCode.NoContent)
  }

  private async approveRejectedVerification(
    user: UserModel,
    body: ApproveUserVerificationInput,
    updatedBy: string,
  ): Promise<void> {
    const currentVerificationStatus = await this.userKYCProviderVerificationEntityService.getByUserIdAndLevelNameForUpdate(
      user.id,
      body.providerLevelName,
    )

    if (!currentVerificationStatus) {
      throw new Error(`unexpected: user verification record not found`)
    }

    if (
      currentVerificationStatus.status !== KYCProviderApplicationStatus.Rejected ||
      currentVerificationStatus.statusReasonCode !== KYCStatusReasonCode.SystemFullNameMatchingRejected
    ) {
      throw new Error(
        `unexpected: the verification record status is not valid. Expected status is (${KYCProviderApplicationStatus.Rejected}) and reason code is (${currentVerificationStatus.statusReasonCode})`,
      )
    }

    await this.userKYCProviderVerificationEntityService.upsertOne({
      userId: currentVerificationStatus.userId,
      providerLevelName: currentVerificationStatus.providerLevelName,
      providerApplicantId: currentVerificationStatus.providerApplicantId,
      status: KYCProviderApplicationStatus.Approved,
      statusReason: `Updated by: ${updatedBy}. ${body.reason}`,
      statusReasonCode: KYCStatusReasonCode.SystemFullNameMatchingApprovedManually,
      payload: null,
    })
  }

  // THIS IS A DUPLICATE METHOD
  // WE SHOULD MAKE A REFACTORING WHEN THE MANUAL APPROVAL BY CUSTOMER SUPPORT ARRIVES
  private async tryUnblockingUser(
    user: UserModel,
    body: ApproveUserVerificationInput,
    updatedBy: string,
  ): Promise<void> {
    // unblock the user **only if he was blocked by KYC provider (SumSub)

    const userDetails = await this.userDetailsEntityService.getOne({ userId: user.id })

    if (userDetails?.status !== UserStatus.Blocked) {
      this.logger.warn(
        `tryUnblockingUser(): user is not eligible for manual unblocking. The user is not blocked`,
        user.uid,
      )
      return
    }

    // if the user is updated after he was blocked or was not blocked by the KYC provider
    // we should not unblock him by re-approving
    if (userDetails?.updatedBy !== SUMSUB_WEBHOOK_UPDATED_BY) {
      throw new Error(
        `tryUnblockingUser(): user is not eligible for manual unblocking. The last user update was not by SumSub`,
      )
    }

    try {
      await this.userAccountManagementService.unblock(user, updatedBy, body.reason)
    } catch (err: any) {
      // Do not break the flow
      this.logger.error(`unexpected: could not unblock the user ${user.uid}`)
      this.logger.error(err, user.uid)
    }
  }
}
