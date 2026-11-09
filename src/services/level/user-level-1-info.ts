2021

import { inject, injectable } from 'inversify'

import { IUserBankAccountEntityService, UserBankAccountEntityServiceSymbol, UserLevel } from '../../models/db'
import {
  BaseUserLevelInfo,
  BenefitInfo,
  IUserLevelInfo,
  LevelStatus,
  RequirementInfo,
  StatusInfo,
} from './user-level-info'
import { USDC } from '../../utils/formatter'

export enum LevelOneRequirement {
  PersonalInfo_FullName = 'internal:personal_info:full_name',
  PersonalInfo_DoB = 'internal:personal_info:dob',

  BankAccount = 'internal:bank_account',
}
export const LevelOneRequirements: LevelOneRequirement[] = Object.values(LevelOneRequirement)

@injectable()
export class UserLevel1Info
  extends BaseUserLevelInfo<LevelOneRequirement>
  implements IUserLevelInfo<LevelOneRequirement> {
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService

  readonly requirements: RequirementInfo<LevelOneRequirement>[] = [
    { code: LevelOneRequirement.PersonalInfo_FullName, description: 'Provide Full Name' },
    { code: LevelOneRequirement.PersonalInfo_DoB, description: 'Provide Date of Birth' },
    { code: LevelOneRequirement.BankAccount, description: 'Add Bank Account' },
  ]

  constructor() {
    super(10, UserLevel.Level1, 'Level 1')
  }

  async getRequirementsDescription(): Promise<string> {
    return ''
  }

  async getBenefitsDescription(): Promise<string> {
    const { combinedTurnoverLimitUsdc } = await this.getLimits()
    const combinedTurnover = combinedTurnoverLimitUsdc ? USDC(combinedTurnoverLimitUsdc, false) : 'no limits'

    return `Neobank App lets you deposit up to ${combinedTurnover} and withdraw at any time.`
  }

  async getBenefits(): Promise<BenefitInfo[]> {
    const { sell1DayLimitUsdc, combinedTurnoverLimitUsdc } = await this.getLimits()

    const sellDaily = sell1DayLimitUsdc ? USDC(sell1DayLimitUsdc, false) : 'no limits'
    const combinedTurnover = combinedTurnoverLimitUsdc ? USDC(combinedTurnoverLimitUsdc, false) : 'no limits'

    return [
      {
        label: 'Deposit / Receive',
        value: combinedTurnoverLimitUsdc,
        formattedValue: `${combinedTurnover} (lifetime)`,
      },
      { label: 'Withdraw', value: sell1DayLimitUsdc, formattedValue: `${sellDaily} per day` },
      { label: 'Send', value: 0, formattedValue: 'Not Available' },
    ]
  }

  async checkRequirements(userId: number): Promise<boolean> {
    const currentLevel = await this.getCurrentLevel(userId)
    if (currentLevel.code === this.code) {
      return true
    }

    const [userDetails, userBankAccount] = await Promise.all([
      this.userDetailsEntityService.getOne({ userId }),
      this.userBankAccountEntityService.getOne({ userId }),
    ])

    if (!userDetails) {
      throw new Error(`unexpected: the user details for a user ${userId} are not found`)
    }

    const previousLevelReached = currentLevel.code === UserLevel.Level0
    const allRequiredDataPresent = [
      userDetails.firstName,
      userDetails.lastName,
      userDetails.dateOfBirth,
      userDetails.phone,
      userDetails.email,
      userBankAccount,
    ].reduce((res, curr) => res && !!curr, true)

    return previousLevelReached && allRequiredDataPresent
  }

  async getRemainingRequirements(userId: number): Promise<RequirementInfo<LevelOneRequirement>[]> {
    let remainingRequirements = [...this.requirements]

    const [userDetails, userBankAccount] = await Promise.all([
      this.userDetailsEntityService.getOne({ userId }),
      this.userBankAccountEntityService.getOne({ userId }),
    ])

    if (userDetails?.firstName && userDetails?.lastName) {
      remainingRequirements = remainingRequirements.filter(x => x.code !== LevelOneRequirement.PersonalInfo_FullName)
    }

    if (userDetails?.dateOfBirth) {
      remainingRequirements = remainingRequirements.filter(x => x.code !== LevelOneRequirement.PersonalInfo_DoB)
    }

    if (userBankAccount) {
      remainingRequirements = remainingRequirements.filter(x => x.code !== LevelOneRequirement.BankAccount)
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

    return {
      status: LevelStatus.InProgress,
    }
  }
}
