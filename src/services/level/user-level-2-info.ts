2021

import { inject, injectable } from 'inversify'
import { and } from '@ts-awesome/orm'

import { USDC } from '../../utils/formatter'

import {
  IUserBankAccountEntityService,
  IUserKYCProviderVerificationEntityService,
  KYCLevel2Levels,
  KYCProviderApplicationStatus,
  UserBankAccountEntityServiceSymbol,
  UserKYCProviderVerificationEntityServiceSymbol,
  UserKYCProviderVerificationModel,
  UserLevel,
} from '../../models/db'

import {
  BaseUserLevelInfo,
  BenefitInfo,
  IUserLevelInfo,
  LevelStatus,
  RequirementInfo,
  StatusInfo,
} from './user-level-info'

export enum LevelTwoRequirement {
  PersonalInfo_Address = 'internal:personal_info:address',
  KYCProviderVerification_KYCLevel2 = 'external:kyc_provider_verification:kyc_level_2',
}
export const LevelTwoRequirements: LevelTwoRequirement[] = Object.values(LevelTwoRequirement)

@injectable()
export class UserLevel2Info
  extends BaseUserLevelInfo<LevelTwoRequirement>
  implements IUserLevelInfo<LevelTwoRequirement> {
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService
  @inject(UserKYCProviderVerificationEntityServiceSymbol)
  userKYCProviderVerificationEntityService!: IUserKYCProviderVerificationEntityService

  readonly requirements: RequirementInfo<LevelTwoRequirement>[] = [
    { code: LevelTwoRequirement.PersonalInfo_Address, description: 'Provide Home Address' },
    {
      code: LevelTwoRequirement.KYCProviderVerification_KYCLevel2,
      description: 'Verify Personal Information and Photo ID',
    },
  ]

  constructor() {
    super(20, UserLevel.Level2, 'Level 2')
  }

  async getRequirementsDescription(): Promise<string> {
    return ''
  }

  async getBenefitsDescription(): Promise<string> {
    const { sell1DayLimitUsdc, send1DayLimitUsdc, combinedTurnoverLimitUsdc } = await this.getLimits()

    const sellDaily = sell1DayLimitUsdc ? USDC(sell1DayLimitUsdc, false) : 'no limits'
    const sendDaily = send1DayLimitUsdc ? USDC(send1DayLimitUsdc, false) : 'no limits'
    const combinedTurnover = combinedTurnoverLimitUsdc ? USDC(combinedTurnoverLimitUsdc, false) : 'no limits'

    return `Neobank App lets you deposit and receive up to ${combinedTurnover}, send up to ${sendDaily} daily, and withdraw up to ${sellDaily} daily.`
  }

  async getBenefits(): Promise<BenefitInfo[]> {
    const {
      sell1DayLimitUsdc,
      send1DayLimitUsdc,
      send7DayLimitUsdc,
      send30DayLimitUsdc,
      combinedTurnoverLimitUsdc,
    } = await this.getLimits()

    const sellDaily = sell1DayLimitUsdc ? USDC(sell1DayLimitUsdc, false) : 'no limits'
    const sendDaily = send1DayLimitUsdc ? USDC(send1DayLimitUsdc, false) : 'no limits'
    const sendWeekly = send7DayLimitUsdc ? USDC(send7DayLimitUsdc, false) : 'no limits'
    const sendMonthly = send30DayLimitUsdc ? USDC(send30DayLimitUsdc, false) : 'no limits'
    const combinedTurnover = combinedTurnoverLimitUsdc ? USDC(combinedTurnoverLimitUsdc, false) : 'no limits'

    return [
      {
        label: 'Deposit / Receive',
        value: combinedTurnoverLimitUsdc,
        formattedValue: `${combinedTurnover} (lifetime)`,
      },
      { label: 'Withdraw', value: sell1DayLimitUsdc, formattedValue: `${sellDaily} per day` },
      { label: 'Send', value: send1DayLimitUsdc, formattedValue: `${sendDaily} per day` },
      { label: 'Send', value: send7DayLimitUsdc, formattedValue: `${sendWeekly} per 7 days` },
      { label: 'Send', value: send30DayLimitUsdc, formattedValue: `${sendMonthly} per 30 days` },
    ]
  }

  async checkRequirements(userId: number): Promise<boolean> {
    const currentLevel = await this.getCurrentLevel(userId)
    if (currentLevel.code === this.code) {
      return true
    }

    const [userDetails, userKYCProviderVerification] = await Promise.all([
      this.userDetailsEntityService.getOne({ userId }),
      this.getKYCVerification(userId),
    ])

    if (!userDetails) {
      throw new Error(`unexpected: the user details for a user ${userId} are not found`)
    }

    let kycVerification = null
    const isApproved = await this.isApplicationStatusApproved(userKYCProviderVerification)
    if (isApproved) {
      kycVerification = userKYCProviderVerification
    }

    const previousLevelReached = currentLevel.code === UserLevel.Level1
    const allRequiredDataPresent = [userDetails.address, kycVerification].reduce((res, curr) => res && !!curr, true)

    return previousLevelReached && allRequiredDataPresent
  }

  async getRemainingRequirements(userId: number): Promise<RequirementInfo<LevelTwoRequirement>[]> {
    let remainingRequirements = [...this.requirements]

    const [userDetails, userKYCProviderVerification] = await Promise.all([
      this.userDetailsEntityService.getOne({ userId }),
      this.getKYCVerification(userId),
    ])

    if (userDetails?.address) {
      remainingRequirements = remainingRequirements.filter(x => x.code !== LevelTwoRequirement.PersonalInfo_Address)
    }

    const isApproved = await this.isApplicationStatusApproved(userKYCProviderVerification)
    if (isApproved) {
      remainingRequirements = remainingRequirements.filter(
        x => x.code !== LevelTwoRequirement.KYCProviderVerification_KYCLevel2,
      )
    }

    return remainingRequirements
  }

  async getStatus(userId: number): Promise<StatusInfo> {
    const currentLevel = await this.getCurrentLevel(userId)
    if (currentLevel.code === this.code) {
      return { status: LevelStatus.Approved }
    }

    const previousLevelsCompleted = await this.getCompletedLevelCodes(userId)
    if (previousLevelsCompleted.includes(this.code)) {
      return { status: LevelStatus.Approved }
    }

    const [userDetails, userKYCProviderVerification] = await Promise.all([
      this.userDetailsEntityService.getOne({ userId }),
      this.getKYCVerification(userId),
    ])

    if (!userDetails) {
      throw new Error(`unexpected: the user details for a user ${userId} are not found`)
    }

    if (!userKYCProviderVerification) {
      if (userDetails.address && currentLevel.code === UserLevel.Level1) {
        return { status: LevelStatus.InProgress }
      }

      return { status: LevelStatus.NotStarted }
    }

    if (userKYCProviderVerification?.status === KYCProviderApplicationStatus.Pending) {
      return { status: LevelStatus.Pending }
    }

    if (userKYCProviderVerification?.status === KYCProviderApplicationStatus.Rejected) {
      return { status: LevelStatus.Rejected }
    }

    return { status: LevelStatus.InProgress }
  }

  private async isApplicationStatusApproved(userKYCProviderVerification?: UserKYCProviderVerificationModel | null) {
    const isApproved =
      userKYCProviderVerification && userKYCProviderVerification.status === KYCProviderApplicationStatus.Approved

    return isApproved
  }

  private async getKYCVerification(userId: number) {
    return this.userKYCProviderVerificationEntityService.getOne(x =>
      and(x.userId.eq(userId), x.providerLevelName.in(KYCLevel2Levels)),
    )
  }
}
