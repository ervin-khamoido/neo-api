2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { addYears } from 'date-fns'

import {
  IUserEntityService,
  UserEntityServiceSymbol,
  UserRetentionModel,
  UserRetentionEntityServiceSymbol,
  IUserRetentionEntityService,
  UserRetentionStatus,
} from '../models/db'

const RETENTION_YEARS = 5

export interface IUserRetentionService {
  create(userId: number): Promise<UserRetentionModel>
}

export const UserRetentionServiceSymbol = Symbol.for('IUserRetentionService')

@injectable()
export class UserRetentionService implements IUserRetentionService {
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserRetentionEntityServiceSymbol) userRetentionEntityService!: IUserRetentionEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserRetentionService)
  }

  async create(userId: number): Promise<UserRetentionModel> {
    const retentionStartTime = new Date()
    const retentionExpireTime = addYears(retentionStartTime, RETENTION_YEARS)

    const userRetentionRecord = await this.userRetentionEntityService.addOne({
      userId: userId,
      status: UserRetentionStatus.Active,
      statusReason: null,
      retentionStartedAt: retentionStartTime,
      retentionExpiresAt: retentionExpireTime,
    })

    return userRetentionRecord
  }
}
