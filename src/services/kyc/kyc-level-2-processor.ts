2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { KYCProviderApplicationStatus, KYCProviderLevelName } from '../../models/db'
import {
  ApplicantReviewedWebhookInput,
  ReviewAnswer,
  ReviewRejectType,
  ReviewResultRedInput,
} from '../../models/webhooks/sumsub'

import { BaseUserKYCLevelProcessor, IUserKYCLevelProcessor, KYCStatusReasonCode } from './kyc-level-processor'

import { FullNameMatchResult, IUserFullNameService, UserFullNameServiceSymbol } from '../user-full-name.service'
import { IKYCLevelVerificationResult } from './user-kyc-verification.service'

@injectable()
export class UserKYCLevel2Processor extends BaseUserKYCLevelProcessor implements IUserKYCLevelProcessor {
  private logger: ILogger

  @inject(UserFullNameServiceSymbol) userFullNameService!: IUserFullNameService

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super(KYCProviderLevelName.KYCLevel2)

    this.logger = loggerFactory(UserKYCLevel2Processor)
  }

  async determineKYCLevelVerificationStatus(
    userId: number,
    payload: ApplicantReviewedWebhookInput,
  ): Promise<IKYCLevelVerificationResult> {
    const { reviewResult } = payload

    switch (reviewResult.reviewAnswer) {
      case ReviewAnswer.Green: {
        return await this.calculateGreenApplicationStatus(userId, payload.applicantId)
      }
      case ReviewAnswer.Red: {
        return await this.calculateRedApplicationStatus(reviewResult)
      }
      default: {
        this.logger.error(`critical: Received an unsupported review answer type`)
        break
      }
    }

    return {
      status: KYCProviderApplicationStatus.Failed,
      statusReason: 'Unable to determine a final KYC verification status. Requires investigation.',
      statusReasonCode: KYCStatusReasonCode.SystemFailed,
    }
  }

  private async matchFullName(userId: number, applicantId: string): Promise<FullNameMatchResult> {
    const [userDetails, applicantData] = await Promise.all([
      this.userDetailsEntityService.getOne({ userId }),
      this.sumsubService.getApplicantData(applicantId),
    ])

    if (!userDetails || !userDetails.fullName) {
      throw new Error(`unexpected: user details or user full name not found for user ${userId}`)
    }

    const { info } = applicantData
    const applicantFullName = this.userFullNameService.compose({
      firstName: info.firstName!,
      middleName: info.middleName,
      lastName: info.lastName!,
    })

    if (applicantFullName === null) {
      throw new Error('unexpected: userFullNameService.compose user full name return ')
    }

    const fullNameMatchResult = this.userFullNameService.match(userDetails.fullName, applicantFullName!)

    return fullNameMatchResult
  }

  private async calculateGreenApplicationStatus(
    userId: number,
    applicantId: string,
  ): Promise<IKYCLevelVerificationResult> {
    let finalStatus: KYCProviderApplicationStatus | null = null
    let finalStatusReason = null
    let reasonCode = null

    // Verify applicant data meets internal requirements
    const fullNameMatchResult = await this.matchFullName(userId, applicantId)

    // Approved if requirements fulfilled, rejected otherwise
    if (!fullNameMatchResult.match) {
      finalStatus = KYCProviderApplicationStatus.Rejected
      finalStatusReason = `Full name from SumSub and in the user profile did not match. ${fullNameMatchResult.matchReason?.reason}`
      reasonCode = KYCStatusReasonCode.SystemFullNameMatchingRejected
    } else {
      finalStatus = KYCProviderApplicationStatus.Approved
      reasonCode = KYCStatusReasonCode.SystemFullNameMatchingApproved
    }

    return {
      status: finalStatus,
      statusReason: finalStatusReason,
      statusReasonCode: reasonCode,
    }
  }

  private async calculateRedApplicationStatus(
    reviewResult: ReviewResultRedInput,
  ): Promise<IKYCLevelVerificationResult> {
    let finalStatus: KYCProviderApplicationStatus | null = null
    let finalStatusReason = null
    let reasonCode = null

    switch (reviewResult.reviewRejectType) {
      case ReviewRejectType.Final: {
        finalStatus = KYCProviderApplicationStatus.Rejected
        finalStatusReason = reviewResult.clientComment
        reasonCode = KYCStatusReasonCode.KYCProviderRejected
        break
      }
      case ReviewRejectType.Retry: {
        finalStatus = KYCProviderApplicationStatus.Retry
        finalStatusReason = reviewResult.clientComment
        reasonCode = KYCStatusReasonCode.KYCProviderRetry
        break
      }
      default: {
        this.logger.error(
          `critical: Review rejection type is not supported. Type received: ${reviewResult.reviewRejectType}`,
        )

        finalStatus = KYCProviderApplicationStatus.Failed
        finalStatusReason = 'Received an unsupported rejection type. Requires investigation.'
        reasonCode = KYCStatusReasonCode.SystemFailed
      }
    }

    return {
      status: finalStatus,
      statusReason: finalStatusReason,
      statusReasonCode: reasonCode,
    }
  }
}
