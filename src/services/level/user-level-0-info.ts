2021

import { injectable } from 'inversify'

import { UserLevel } from '../../models/db'

import {
  BaseUserLevelInfo,
  BenefitInfo,
  IUserLevelInfo,
  LevelStatus,
  RequirementInfo,
  StatusInfo,
} from './user-level-info'
import { USDC } from '../../utils/formatter'

export enum LevelZeroRequirement {
  PersonalInfo_Phone = 'internal:personal_info:phone',
  PersonalInfo_Email = 'internal:personal_info:email',
}
export const LevelZeroRequirements: LevelZeroRequirement[] = Object.values(LevelZeroRequirement)

@injectable()
export class UserLevel0Info
  extends BaseUserLevelInfo<LevelZeroRequirement>
  implements IUserLevelInfo<LevelZeroRequirement> {
  readonly requirements: RequirementInfo<LevelZeroRequirement>[] = [
    { code: LevelZeroRequirement.PersonalInfo_Phone, description: 'Verify Phone Number' },
    { code: LevelZeroRequirement.PersonalInfo_Email, description: 'Verify Email Address' },
  ]

  constructor() {
    super(0, UserLevel.Level0, 'Level 0')
  }

  async getRequirementsDescription(): Promise<string> {
    return ''
  }

  async getBenefitsDescription(): Promise<string> {
    return ''
  }

  async getBenefits(): Promise<BenefitInfo[]> {
    return []
  }

  async checkRequirements(userId: number): Promise<boolean> {
    return true
  }

  async getRemainingRequirements(userId: number): Promise<RequirementInfo<LevelZeroRequirement>[]> {
    return []
  }

  async getStatus(userId: number): Promise<StatusInfo> {
    return {
      status: LevelStatus.Approved,
    }
  }
}
