2023

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { inject, injectable } from 'inversify'
import {
  IUserBaNameMatchLogEntityService,
  UserBaNameMatchLogEntityServiceSymbol,
  UserBaNameMatchLogModel,
  UserBaNameMatchLogSourceEnum,
} from '../../models/db'
import { FullNameMatchResult } from '../user-full-name.service'

type BankAccountDetailsType = {
  bankAccountNumber: string
  bankId: number
  bankCode: string
}

type UserFullNameType = {
  fullName: string | null
  firstName: string | null
  lastName: string | null
  middleName?: string | null
}

export interface IUserBaNameMatchLogService {
  create(
    userId: number,
    source: UserBaNameMatchLogSourceEnum,
    userName: UserFullNameType,
    bankAccountDetails?: BankAccountDetailsType | null,
    response?: any | null,
    matchResult?: (any & { match: boolean }) | null,
  ): Promise<UserBaNameMatchLogModel | null>
}

export const UserBaNameMatchLogServiceSymbol = Symbol.for('IUserBaNameMatchLogService')

@injectable()
export class UserBaNameMatchLogService implements IUserBaNameMatchLogService {
  private logger: ILogger

  @inject(UserBaNameMatchLogEntityServiceSymbol) userBaNameMatchLogEntityService!: IUserBaNameMatchLogEntityService

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserBaNameMatchLogService)
  }

  async create(
    userId: number,
    source: UserBaNameMatchLogSourceEnum,
    userName: UserFullNameType,
    bankAccountDetails?: BankAccountDetailsType | null,
    response?: any | null,
    matchResult?: (any & { match: boolean }) | null,
  ): Promise<UserBaNameMatchLogModel | null> {
    try {
      const model = await this.userBaNameMatchLogEntityService.addOne({
        userId: userId,
        source: source,
        userName: {
          fullName: userName.fullName,
          firstName: userName.firstName,
          lastName: userName.lastName,
          middleName: userName.middleName,
        },
        bankAccountDetails: bankAccountDetails,
        response: response,
        match: matchResult?.match ?? null,
        matchDetails: matchResult,
      })
      return model
    } catch (err: any) {
      this.logger.error('user name match log was not successful')
      this.logger.error(err)
    }

    return null
  }
}
