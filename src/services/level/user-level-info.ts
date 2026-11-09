2021

import { inject, injectable, unmanaged } from 'inversify'
import { asc, of } from '@ts-awesome/orm'

import {
  IUserDetailsEntityService,
  IUserLevelEntityService,
  IUserLevelLimitEntityService,
  UserDetailsEntityServiceSymbol,
  UserDetailsModel,
  UserLevel,
  UserLevelEntityServiceSymbol,
  UserLevelLimitEntityServiceSymbol,
  UserLevelLimitModel,
  UserLevelModel,
} from '../../models/db'

export interface IUserLevelInfo<TRequirement> {
  readonly order: number
  readonly code: UserLevel
  readonly name: string

  getRequirementsDescription(): Promise<string>
  readonly requirements: RequirementInfo<TRequirement>[]
  getRemainingRequirements(userId: number): Promise<RequirementInfo<TRequirement>[]>

  getBenefitsDescription(): Promise<string>
  getBenefits(): Promise<BenefitInfo[]>

  checkRequirements(userId: number): Promise<boolean>
  getStatus(userId: number): Promise<StatusInfo>
}

@injectable()
export abstract class BaseUserLevelInfo<TRequirement> implements IUserLevelInfo<TRequirement> {
  @inject(UserLevelEntityServiceSymbol) userLevelEntityService!: IUserLevelEntityService
  @inject(UserLevelLimitEntityServiceSymbol) userLevelLimitEntityService!: IUserLevelLimitEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService

  abstract readonly requirements: RequirementInfo<TRequirement>[]

  protected constructor(
    @unmanaged() readonly order: number,
    @unmanaged() readonly code: UserLevel,
    @unmanaged() readonly name: string,
  ) {}

  abstract getBenefitsDescription(): Promise<string>
  abstract getBenefits(): Promise<BenefitInfo[]>
  abstract getRequirementsDescription(): Promise<string>
  abstract checkRequirements(userId: number): Promise<boolean>
  abstract getRemainingRequirements(userId: number): Promise<RequirementInfo<TRequirement>[]>
  abstract getStatus(userId: number): Promise<StatusInfo>

  protected async getLevel(): Promise<UserLevelModel> {
    const userLevel = await this.userLevelEntityService.getOne({ code: this.code })

    if (!userLevel) {
      throw new Error(`unexpected: the user level with a code ${this.code} is not found`)
    }

    return userLevel
  }

  protected async getLimits(): Promise<UserLevelLimitModel> {
    const levelLimits = await this.userLevelLimitEntityService
      .select()
      .join(UserLevelModel, (root, other) => root.userLevelId.eq(other.id))
      .where(() => of(UserLevelModel, 'code').eq(this.code))
      .fetchOne()

    if (!levelLimits) {
      throw new Error(`unexpected: the user level limits for a level code ${this.code} are not found`)
    }

    return levelLimits
  }

  protected async getCurrentLevel(userId: number): Promise<UserLevelModel> {
    const currentLevel = await this.userLevelEntityService
      .select()
      .join(UserDetailsModel, (root, other) => root.id.eq(other.userLevelId))
      .where(() => of(UserDetailsModel, 'userId').eq(userId))
      .fetchOne()

    if (!currentLevel) {
      throw new Error(`unexpected: the user's current level for a user ${userId} is not found`)
    }

    return currentLevel
  }

  protected async getCompletedLevelCodes(userId: number): Promise<UserLevel[]> {
    const currentLevel = await this.getCurrentLevel(userId)

    const previousLevelsCompleted = await this.userLevelEntityService
      .select()
      .where(x => x.code.lt(currentLevel.code))
      .orderBy(x => [asc(x.code)])
      .fetch()

    const completedLevelCodes = previousLevelsCompleted.map(x => x.code)

    return completedLevelCodes
  }
}

export type BenefitInfo = {
  label: string
  value: number | string | boolean | null
  formattedValue: string
}

export enum LevelStatus {
  NotAvailable = 'not_available',
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Error = 'error',
}
export const LevelStatuses = Object.values(LevelStatus)

export enum StatusDetailsAction {
  ContactSupport = 'contact_support',
}

export type StatusInfo = {
  status: LevelStatus
  message?: string
  code?: string
  actions?: Partial<Record<StatusDetailsAction, boolean>>
}

export type RequirementInfo<TRequirement> = {
  code: TRequirement
  description: string
}
