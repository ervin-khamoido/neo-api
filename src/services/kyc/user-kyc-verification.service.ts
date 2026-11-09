2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  IUserDetailsEntityService,
  IUserKYCProviderVerificationEntityService,
  KYCProviderApplicationStatus,
  KYCProviderLevelName,
  UserDetailsEntityServiceSymbol,
  UserKYCProviderVerificationEntityServiceSymbol,
  UserKYCProviderVerificationModel,
  UserModel,
} from '../../models/db'
import { ApplicantReviewedWebhookInput } from '../../models/webhooks/sumsub'

import {
  IUserKYCLevelProcessor,
  IUserKYCLevelProcessorFactory,
  KYCLevelProcessorType,
  KYCStatusReasonCode,
  UserKYCLevelProcessorFactorySymbol,
} from './kyc-level-processor'

import { SumsubServiceSymbol, ISumsubService } from '../sumsub.service'

export interface IKYCLevelVerificationResult {
  status: KYCProviderApplicationStatus
  statusReason?: string | null
  statusReasonCode: KYCStatusReasonCode
}

export interface IUserKYCVerificationService {
  setApplicantReviewedFinalStatus(
    user: UserModel,
    payload: ApplicantReviewedWebhookInput,
  ): Promise<UserKYCProviderVerificationModel>
}

export const UserKYCVerificationServiceSymbol = Symbol.for('IUserKYCVerificationService')

@injectable()
export class UserKYCVerificationService implements IUserKYCVerificationService {
  private readonly kycLevelMap: Record<KYCProviderLevelName, IUserKYCLevelProcessor | null>

  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserKYCProviderVerificationEntityServiceSymbol)
  userKYCProviderVerificationEntityService!: IUserKYCProviderVerificationEntityService

  @inject(SumsubServiceSymbol) sumsubService!: ISumsubService

  private logger: ILogger

  constructor(
    @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory,
    @inject(UserKYCLevelProcessorFactorySymbol) userKYCLevelProcessorFactory: IUserKYCLevelProcessorFactory,
  ) {
    this.logger = loggerFactory(UserKYCVerificationService)

    this.kycLevelMap = Object.freeze({
      // default
      [KYCProviderLevelName.KYCLevel2]: userKYCLevelProcessorFactory(KYCLevelProcessorType.KYCLevel2),
      // dev, feature testing
      [KYCProviderLevelName.KYCLevel2Dev]: userKYCLevelProcessorFactory(KYCLevelProcessorType.KYCLevel2),
      [KYCProviderLevelName.KYCLevel2FT]: userKYCLevelProcessorFactory(KYCLevelProcessorType.KYCLevel2),
    })
  }

  async setApplicantReviewedFinalStatus(
    user: UserModel,
    payload: ApplicantReviewedWebhookInput,
  ): Promise<UserKYCProviderVerificationModel> {
    const kycLevelProcessor = this.kycLevelMap[payload.levelName]
    if (!kycLevelProcessor) {
      throw new Error(`critical: No processor found for KYC level ${payload.levelName}`)
    }

    const result = await kycLevelProcessor.determineKYCLevelVerificationStatus(user.id, payload)

    const verificationRecord = (await this.userKYCProviderVerificationEntityService.upsertOne({
      userId: user.id,
      providerLevelName: payload.levelName,
      providerApplicantId: payload.applicantId,
      status: result.status,
      statusReason: result.statusReason ?? null,
      statusReasonCode: result.statusReasonCode,
      payload: payload,
    }))!

    return verificationRecord
  }
}
