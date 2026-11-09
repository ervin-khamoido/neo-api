2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { DuplicateValueDbError } from '@ts-awesome/orm-pg'
import { NotFoundError } from '@ts-awesome/rest'
import { intersection, difference } from 'lodash'

import {
  IKYCLevelEntityService,
  IUserDetailsEntityService,
  IUserEntityService,
  IUserKYCProviderVerificationEntityService,
  KYCLevelEntityServiceSymbol,
  KYCProviderApplicationStatus,
  UserDetailsEntityServiceSymbol,
  UserEntityServiceSymbol,
  UserKYCProviderVerificationEntityServiceSymbol,
  UserModel,
  UserStatus,
} from '../../models/db'

import {
  ApplicantCreatedWebhookInput,
  ApplicantPendingWebhookInput,
  ApplicantReviewedWebhookInput,
  FINAL_REJECTION_LABELS_TO_HALT_RE_REVIEW,
  ReviewResultRedInput,
} from '../../models/webhooks/sumsub'

import { ISumsubService, SumsubServiceSymbol } from '../sumsub.service'
import { IUserLevelService, UserLevelServiceSymbol } from '../level/user-level.service'
import { IUserAccountManagementService, UserAccountManagementServiceSymbol } from '../user-account-management.service'
import { IUserKYCVerificationService, UserKYCVerificationServiceSymbol } from '../kyc/user-kyc-verification.service'

// DO NOT CHANGE
export const SUMSUB_WEBHOOK_UPDATED_BY = 'sumsub:applicant:webhook'

export interface ISumsubWebhookService {
  resolveApplicantCreatedWebhook(payload: ApplicantCreatedWebhookInput): Promise<void>
  resolveApplicantPendingWebhook(payload: ApplicantPendingWebhookInput): Promise<void>
  resolveApplicantReviewedWebhook(payload: ApplicantReviewedWebhookInput): Promise<void>
}

export const SumsubWebhookServiceSymbol = Symbol.for('ISumsubWebhookService')

@injectable()
export class SumsubWebhookService implements ISumsubWebhookService {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(KYCLevelEntityServiceSymbol) kycLevelEntityService!: IKYCLevelEntityService
  @inject(UserKYCProviderVerificationEntityServiceSymbol)
  userKYCProviderVerificationEntityService!: IUserKYCProviderVerificationEntityService

  @inject(SumsubServiceSymbol) sumsubService!: ISumsubService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService
  @inject(UserAccountManagementServiceSymbol) userAccountManagementService!: IUserAccountManagementService
  @inject(UserKYCVerificationServiceSymbol) userKYCVerificationService!: IUserKYCVerificationService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(SumsubWebhookService)
  }

  async resolveApplicantCreatedWebhook(payload: ApplicantCreatedWebhookInput): Promise<void> {
    const [user, kycLevel] = await Promise.all([
      this.userEntityService.getOne({ uid: payload.externalUserId }),
      this.kycLevelEntityService.getOne({ providerLevelName: payload.levelName }),
    ])

    if (!user) {
      throw new NotFoundError(`critical: User (${payload.externalUserId}) not found`)
    }

    if (!kycLevel) {
      throw new NotFoundError(`critical: KYC level with name ${payload.levelName} not found`)
    }

    try {
      await this.userKYCProviderVerificationEntityService.addOne({
        userId: user.id,
        providerLevelName: payload.levelName,
        providerApplicantId: payload.applicantId,
        status: KYCProviderApplicationStatus.Created,
        statusReason: null,
        statusReasonCode: null,
        payload: payload,
      })
    } catch (err: any) {
      if (err instanceof DuplicateValueDbError) {
        this.logger.warn(`KYC level [${payload.levelName}] already started for user [${payload.externalUserId}]`)
      } else {
        throw err
      }
    }
  }

  async resolveApplicantPendingWebhook(payload: ApplicantPendingWebhookInput): Promise<void> {
    const [user, kycLevel] = await Promise.all([
      this.userEntityService.getOne({ uid: payload.externalUserId }),
      this.kycLevelEntityService.getOne({ providerLevelName: payload.levelName }),
    ])

    if (!user) {
      throw new NotFoundError(`critical: User (${payload.externalUserId}) not found`)
    }

    if (!kycLevel) {
      throw new NotFoundError(`critical: KYC level with name ${payload.levelName} not found`)
    }

    const currentVerificationStatus = await this.userKYCProviderVerificationEntityService.getByUserIdAndLevelNameForUpdate(
      user.id,
      payload.levelName,
    )
    if (!currentVerificationStatus) {
      await this.userKYCProviderVerificationEntityService.addOne({
        userId: user.id,
        providerLevelName: payload.levelName,
        providerApplicantId: payload.applicantId,
        status: KYCProviderApplicationStatus.Pending,
        statusReason: null,
        statusReasonCode: null,
        payload: payload,
      })

      return
    }

    const fromStatuses = [
      KYCProviderApplicationStatus.Created,
      KYCProviderApplicationStatus.Retry,
      KYCProviderApplicationStatus.Approved,
      KYCProviderApplicationStatus.Pending,
    ]
    if (!fromStatuses.includes(<KYCProviderApplicationStatus>currentVerificationStatus.status)) {
      throw new Error(
        `precondition failed: application for user [${user.uid}] and level [${currentVerificationStatus.providerLevelName}] is in an invalid state for pending status update`,
      )
    }

    const result = await this.userKYCProviderVerificationEntityService.updateOne({
      userId: currentVerificationStatus.userId,
      providerLevelName: currentVerificationStatus.providerLevelName,
      status: KYCProviderApplicationStatus.Pending,
      payload: payload,
    })
  }

  async resolveApplicantReviewedWebhook(payload: ApplicantReviewedWebhookInput): Promise<void> {
    const [user, kycLevel] = await Promise.all([
      this.userEntityService.getOne({ uid: payload.externalUserId }),
      this.kycLevelEntityService.getOne({ providerLevelName: payload.levelName }),
    ])

    if (!user) {
      throw new NotFoundError(`critical: User (${payload.externalUserId}) not found`)
    }

    if (!kycLevel) {
      throw new NotFoundError(`critical: KYC level with name ${payload.levelName} not found`)
    }

    const currentVerificationStatus = await this.userKYCProviderVerificationEntityService.getByUserIdAndLevelNameForUpdate(
      user.id,
      payload.levelName,
    )

    // Make sure the verification result isn't already in a rejected state or soft rejection state
    let isReApproval = false
    if (
      currentVerificationStatus &&
      <KYCProviderApplicationStatus>currentVerificationStatus.status === KYCProviderApplicationStatus.Rejected
    ) {
      const payload = <ApplicantReviewedWebhookInput>currentVerificationStatus.payload
      const reviewResult = <ReviewResultRedInput>payload?.reviewResult
      const rejectLabels = reviewResult?.rejectLabels ?? []

      const disallowReApprovalLabelsIntersection = intersection(rejectLabels, FINAL_REJECTION_LABELS_TO_HALT_RE_REVIEW)
      const areAllLabelsForReApproval = disallowReApprovalLabelsIntersection.length <= 0

      if (areAllLabelsForReApproval) {
        // allow re-approval for the `FINAL_REJECTION_LABELS_FOR_MANUAL_REVIEW` labels only
        isReApproval = true
      } else {
        throw new Error(
          `precondition failed: application for user [${user.uid}] and level [${currentVerificationStatus.providerLevelName}] is in an invalid state for reviewed status update`,
        )
      }
    }

    // Determine and update the kyc verification status
    const finalVerificationStatus = await this.userKYCVerificationService.setApplicantReviewedFinalStatus(user, payload)

    switch (finalVerificationStatus.status) {
      case KYCProviderApplicationStatus.Approved: {
        const userLevel = await this.userLevelService.getUserLevelByKYCLevelId(kycLevel.id)
        if (!userLevel) {
          throw new NotFoundError(`critical: Could not find a user level associated with KYC level ${kycLevel.code}`)
        }

        // unblock the user **only if he was blocked by SumSub and was initially rejected
        if (isReApproval) {
          await this.tryUnblockingUser(user, 'Unblock triggered by SumSub re-approval')
        }

        // Trigger user level update
        await this.userLevelService.triggerLevelPromotion(user.id, userLevel.code)
        break
      }
      case KYCProviderApplicationStatus.Rejected: {
        // Block the user
        const statusReason = finalVerificationStatus.statusReason?.slice(0, 255)

        await this.userAccountManagementService.block(user, SUMSUB_WEBHOOK_UPDATED_BY, statusReason)
        break
      }
      case KYCProviderApplicationStatus.Retry:
      case KYCProviderApplicationStatus.Failed: {
        // No action required here
        break
      }
      default: {
        throw new Error(`Unexpected final verification status: ${finalVerificationStatus.status}`)
      }
    }
  }

  private async tryUnblockingUser(user: UserModel, reason: string): Promise<void> {
    // unblock the user **only if he was blocked by SumSub

    try {
      const userDetails = await this.userDetailsEntityService.getOne({ userId: user.id })
      if (userDetails?.status !== UserStatus.Blocked) {
        this.logger.warn(`tryUnblockingUser(): user is not eligible for unblocking. The user is not blocked`, user.uid)
        return
      }

      // if the user is updated after he was blocked or was not blocked by the KYC provider
      // we should not unblock him by re-approving
      if (userDetails?.updatedBy !== SUMSUB_WEBHOOK_UPDATED_BY) {
        this.logger.warn(
          `tryUnblockingUser(): user is not eligible for unblocking. The last user update was not by SumSub`,
          user.uid,
        )
        return
      }

      await this.userAccountManagementService.unblock(user, SUMSUB_WEBHOOK_UPDATED_BY, reason)
    } catch (err: any) {
      // Do not break the flow
      this.logger.error(`unexpected: could not unblock the user ${user.uid}`)
      this.logger.error(err, user.uid)
    }
  }
}
