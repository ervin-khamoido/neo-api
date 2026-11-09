2021

import { inject, injectable } from 'inversify'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { readable } from '@ts-awesome/model-reader'

import { cache, CacheKey } from '../utils/cache-util'

import {
  IUserLevelLimitEntityService,
  UserLevelLimitEntityServiceSymbol,
  UserLevelLimitModel,
  IUserDetailsEntityService,
  UserDetailsEntityServiceSymbol,
} from '../models/db'

export class UserLevelResult {
  @readable('user_level_id', String) userLevelId!: string
}

export interface IUserLevelLimitService {
  /**
   * IMPORTANT NOTE:
   *  This was used in previous versions to get the user limits and perform limit checks. It should NOT be used for this anymore.
   *  Instead, get the max available user limits from the UserLimitService.
   * Get the user level limits for a user.
   * @param userId The user ID
   * @returns The user level limit record based on the user's level
   */
  getUserLevelLimits(userId: number): Promise<UserLevelLimitModel | null>
}

export const UserLevelLimitServiceSymbol = Symbol.for('IUserLevelLimitService')

@injectable()
export class UserLevelLimitService implements IUserLevelLimitService {
  @inject(UserLevelLimitEntityServiceSymbol) userLevelLimitEntityService!: IUserLevelLimitEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserLevelLimitService)
  }

  async getUserLevelLimits(userId: number): Promise<UserLevelLimitModel | null> {
    const [userLevelResult, userLevelLimits] = await Promise.all([
      this.userDetailsEntityService
        .select()
        .columns(x => [x.userLevelId])
        .where({ userId: userId })
        .fetchOne(UserLevelResult),
      this.getAllUserLevelLimits(),
    ])

    const userLimits = userLevelLimits.find(x => x.userLevelId === userLevelResult!.userLevelId)

    return userLimits || null
  }

  @cache(CacheKey.UserLevelLimit)
  private async getAllUserLevelLimits(): Promise<readonly UserLevelLimitModel[]> {
    return await this.userLevelLimitEntityService.select().fetch()
  }
}
