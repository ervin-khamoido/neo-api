2021

import { inject, injectable, unmanaged } from 'inversify'

import {
  IUserDetailsEntityService,
  IUserKYCProviderVerificationEntityService,
  KYCProviderLevelName,
  UserDetailsEntityServiceSymbol,
  UserKYCProviderVerificationEntityServiceSymbol,
} from '../../models/db'
import { ApplicantReviewedWebhookInput } from '../../models/webhooks/sumsub'

import { SumsubServiceSymbol, ISumsubService } from '../sumsub.service'
import { IKYCLevelVerificationResult } from './user-kyc-verification.service'

export enum KYCStatusReasonCode {
  // used to indicate that the user's status reason was updated manually
  Manual = 'manual',
  //
  SystemFullNameMatchingRejected = 'system:full-name:matching:rejected',
  //
  SystemFullNameMatchingApproved = 'system:full-name:matching:approved',
  //
  SystemFullNameMatchingApprovedManually = 'system:full-name:matching:approved:manually',
  //
  SystemFailed = 'system:failed',
  //
  KYCProviderRejected = 'kyc-provider:rejected',
  //
  KYCProviderRetry = 'kyc-provider:retry',
  //
  KYCProviderApproved = 'kyc-provider:approved',
}

export enum KYCLevelProcessorType {
  KYCLevel2,
  KYCLevel3,
}

export interface IUserKYCLevelProcessor {
  readonly level: KYCProviderLevelName

  determineKYCLevelVerificationStatus(
    userId: number,
    payload: ApplicantReviewedWebhookInput,
  ): Promise<IKYCLevelVerificationResult>
}

export type IUserKYCLevelProcessorFactory = (kycLevelProcessor: KYCLevelProcessorType) => IUserKYCLevelProcessor | null
export const UserKYCLevelProcessorFactorySymbol = Symbol.for('IUserKYCLevelProcessorFactory')

@injectable()
export abstract class BaseUserKYCLevelProcessor implements IUserKYCLevelProcessor {
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserKYCProviderVerificationEntityServiceSymbol)
  userKYCProviderVerificationEntityService!: IUserKYCProviderVerificationEntityService

  @inject(SumsubServiceSymbol) sumsubService!: ISumsubService

  protected constructor(@unmanaged() readonly level: KYCProviderLevelName) {}

  abstract determineKYCLevelVerificationStatus(
    userId: number,
    payload: ApplicantReviewedWebhookInput,
  ): Promise<IKYCLevelVerificationResult>
}
