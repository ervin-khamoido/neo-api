2021

import { inject, injectable } from 'inversify'
import { of } from '@ts-awesome/orm'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  IUserBankAccountEntityService,
  IUserDetailsEntityService,
  IUserEntityService,
  IUserLevelEntityService,
  UserBankAccountEntityServiceSymbol,
  UserDetailsEntityServiceSymbol,
  UserDetailsModel,
  UserEntityServiceSymbol,
  UserLevel,
  UserLevelEntityServiceSymbol,
  UserLevelModel,
} from '../../models/db'

import { UserLevelInfoOutput } from '../../models/response'
import { IUserLevelInfo, RequirementInfo } from './user-level-info'

import { UserCurrentLevelOutput } from '../../models/response/user-current-level.output'
import { firestore } from 'firebase-admin'
import { IUserLevelInfoFactory, UserLevelInfoFactorySymbol } from './user-level-info.factory'

export interface IUserLevelService {
  triggerLevelPromotion(userId: number, strictLevel?: UserLevel): Promise<void>

  getUserLevel(userId: number): Promise<UserCurrentLevelOutput>
  getLevelsInfo(userId: number): Promise<UserLevelInfoOutput[]>

  getUserLevelByKYCLevelId(kycLevelId: number): Promise<UserLevelModel | null>
}

export const UserLevelServiceSymbol = Symbol.for('IUserLevelService')

@injectable()
export class UserLevelService implements IUserLevelService {
  private readonly userLevelMap: Record<UserLevel, IUserLevelInfo<unknown> | null>
  private readonly nextUserLevelMap: Record<UserLevel, IUserLevelInfo<unknown> | null>

  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserLevelEntityServiceSymbol) userLevelEntityService!: IUserLevelEntityService
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountService!: IUserBankAccountEntityService

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  private logger: ILogger

  constructor(
    @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory,
    @inject(UserLevelInfoFactorySymbol) levelInfoFactory: IUserLevelInfoFactory,
  ) {
    this.logger = loggerFactory(UserLevelService)

    this.userLevelMap = Object.freeze({
      [UserLevel.Level0]: levelInfoFactory(UserLevel.Level0),
      [UserLevel.Level1]: levelInfoFactory(UserLevel.Level1),
      [UserLevel.Level2]: levelInfoFactory(UserLevel.Level2),
      // not implemented yet
      [UserLevel.Level3]: levelInfoFactory(UserLevel.Level3),
    })

    this.nextUserLevelMap = Object.freeze({
      [UserLevel.Level0]: this.userLevelMap[UserLevel.Level1],
      [UserLevel.Level1]: this.userLevelMap[UserLevel.Level2],
      // not implemented yet
      [UserLevel.Level2]: this.userLevelMap[UserLevel.Level3],
      [UserLevel.Level3]: null,
    })
  }

  async triggerLevelPromotion(userId: number, strictLevel?: UserLevel): Promise<void> {
    const currentLevel = await this.getCurrentLevel(userId)

    let levelInfo: IUserLevelInfo<unknown> | null = null
    if (strictLevel) {
      const strictLevelInfo = this.userLevelMap[strictLevel]
      const currentLevelInfo = this.userLevelMap[currentLevel.code]
      if (strictLevelInfo && currentLevelInfo) {
        // User has reached this level already -> skip promotion
        if (strictLevelInfo.order <= currentLevelInfo.order) {
          return
        }

        levelInfo = this.userLevelMap[strictLevel]
      }
    } else {
      levelInfo = this.nextUserLevelMap[currentLevel.code]
    }

    // level is not configured -> skip promotion
    if (!levelInfo) {
      this.logger.error(
        `No level configuration for strictLevelInfo (${strictLevel}) or currentLevelInfo (${currentLevel.code}) found.`,
      )
      return
    }

    const fulfillsRequirements = await levelInfo.checkRequirements(userId)
    if (!fulfillsRequirements) {
      return
    }

    const userLevel = await this.userLevelEntityService.getOne({ code: levelInfo.code })
    if (!userLevel) {
      throw new Error(`unexpected error: the user level (${levelInfo.code}) does not exist`)
    }

    await this.userDetailsEntityService.updateOne({
      userId,
      userLevelId: userLevel.id,
      updatedBy: null,
    })
    await this.notifyLevelVersion(userId)
  }

  async getLevelsInfo(userId: number): Promise<UserLevelInfoOutput[]> {
    const supportedLevels = [UserLevel.Level0, UserLevel.Level1, UserLevel.Level2]

    const resultPromises: Promise<UserLevelInfoOutput | null>[] = supportedLevels.map(async x => {
      const info = this.userLevelMap[x]
      if (!info) {
        return null
      }

      const [requirementsSummary, remainingRequirements, benefitsSummary, benefits, statusInfo] = await Promise.all([
        info.getRequirementsDescription(),
        info.getRemainingRequirements(userId),
        info.getBenefitsDescription(),
        info.getBenefits(),
        info.getStatus(userId),
      ])

      return {
        order: info.order,
        code: info.code,
        name: info.name,

        requirementsSummary: requirementsSummary,
        requirements: info.requirements as RequirementInfo<any>[],
        remainingRequirements: remainingRequirements as RequirementInfo<any>[],

        benefitsSummary: benefitsSummary,
        benefits: benefits,

        status: statusInfo.status,
        statusDetails:
          statusInfo.code && statusInfo.message
            ? { code: statusInfo.code, message: statusInfo.message, actions: statusInfo.actions }
            : null,
      }
    })

    const result = await Promise.all(resultPromises)

    return result.filter(x => x) as UserLevelInfoOutput[]
  }

  async getUserLevel(userId: number): Promise<UserCurrentLevelOutput> {
    const currentLevel = await this.getCurrentLevel(userId)
    const nextLevelInfo = this.nextUserLevelMap[currentLevel.code]

    let nextLevel: UserLevelModel | null = null
    if (nextLevelInfo) {
      nextLevel = await this.userLevelEntityService.getOne({ code: nextLevelInfo.code })
    }

    return {
      current: {
        code: currentLevel.code,
        label: currentLevel.name,
        message: currentLevel.name,
      },
      next: nextLevel
        ? {
            code: nextLevel.code,
            label: nextLevel.name,
            message: nextLevel.name,
          }
        : null,
    }
  }

  async getUserLevelByKYCLevelId(kycLevelId: number): Promise<UserLevelModel | null> {
    const userLevel = await this.userLevelEntityService
      .select()
      .where(x => x.kycLevelId.eq(kycLevelId))
      .fetchOne()

    return userLevel
  }

  private async getCurrentLevel(userId: number): Promise<UserLevelModel> {
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

  private async notifyLevelVersion(userId: number) {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      this.logger.error(`updateLevelVersionInFirebase(): user with a userId ${userId} is not found`)
      return
    }

    try {
      const increment = firestore.FieldValue.increment(1)
      await firestore()
        .collection('user')
        .doc(user.fireUserId)
        .set({ level: { version: increment } }, { merge: true })
    } catch (err: any) {
      this.logger.error(`critical: notify user about level update failed`)
      this.logger.error(err)
    }
  }
}
