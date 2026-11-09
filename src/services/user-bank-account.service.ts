2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { of } from '@ts-awesome/orm'
import { isNil } from 'lodash'

import {
  BankModel,
  IUserBaNameMatchLogEntityService,
  IUserBankAccountConfigEntityService,
  IUserBankAccountEntityService,
  IUserDetailsEntityService,
  UserBaNameMatchLogEntityServiceSymbol,
  UserBaNameMatchLogModel,
  UserBaNameMatchLogSourceEnum,
  UserBankAccountConfigEntityServiceSymbol,
  UserBankAccountConfigModel,
  UserBankAccountEntityServiceSymbol,
  UserBankAccountModel,
  UserDetailsEntityServiceSymbol,
  UserDetailsModel,
  UserLevel,
  UserModel,
} from '../models/db'

import { ValidateUserBankAccountOutput } from '../models/response'

import { IPaystackService, PaystackServiceSymbol } from './paystack.service'
import { IUserLevelService, UserLevelServiceSymbol } from './level/user-level.service'
import utils from '../lib/utils/helpers'
import { NotFoundError } from '@ts-awesome/rest'
import { FullNameMatchResult, IUserFullNameService, UserFullNameServiceSymbol } from './user-full-name.service'
import {
  IUserBaNameMatchLogService,
  UserBaNameMatchLogServiceSymbol,
} from './bank-account/user-ba-name-match-log.service'

type BankAccountInput = {
  bankAccountNumber: string
  userName?: string | null
}

export enum UserBankAccountValidationStatus {
  Valid = 'valid',
  Invalid = 'invalid',
  RequireConfirmation = 'require_confirmation',
}

export enum ReasonCode {
  NoMatch = 'no_match',
}

export interface IUserBankAccountService {
  create(user: UserModel, bank: BankModel, payload: BankAccountInput): Promise<UserBankAccountModel>
  validate(user: UserModel, bank: BankModel, payload: BankAccountInput): Promise<ValidateUserBankAccountOutput>
  delete(user: UserModel, uid: string): Promise<void>
  batchDelete(user: UserModel, uids: string[]): Promise<void>

  anyBankAccountExists(user: UserModel): Promise<boolean>

  existingUserBankAccountMatch(userId: number, newFullName: string): Promise<FullNameMatchResult>

  addUserBankAccountFromLog(bankNameMatchLogId: number, createdBy: string): Promise<UserBankAccountModel>
}

export const UserBankAccountServiceSymbol = Symbol.for('IUserBankAccountService')

@injectable()
export class UserBankAccountService implements IUserBankAccountService {
  private logger: ILogger

  @inject(UserBankAccountEntityServiceSymbol) userBankAccEntityService!: IUserBankAccountEntityService
  @inject(UserBankAccountConfigEntityServiceSymbol) userBankAccConfigEntityService!: IUserBankAccountConfigEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserBaNameMatchLogEntityServiceSymbol) userBaNameMatchLogEntityService!: IUserBaNameMatchLogEntityService

  @inject(PaystackServiceSymbol) paystackService!: IPaystackService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService
  @inject(UserFullNameServiceSymbol) userFullNameService!: IUserFullNameService
  @inject(UserBaNameMatchLogServiceSymbol) userBaNameMatchLogService!: IUserBaNameMatchLogService

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserBankAccountService)
  }

  async create(user: UserModel, bank: BankModel, payload: BankAccountInput): Promise<UserBankAccountModel> {
    const { bankAccountNumber, userName } = payload

    // Format the public bank account number
    const bankAccountNumberPublic = this.formatPublicAccountNumber(bankAccountNumber)

    const userDetails = await this.userDetailsEntityService.getOne({ userId: user.id })
    if (!userDetails) {
      throw new Error('Unexpected error: User has no user details')
    }

    const existingUserBankAccount = await this.getUserBankAccountExists(user.id, bank.id, bankAccountNumber)
    if (existingUserBankAccount) {
      this.logger.info(
        `Bank account for user ${user.uid}, bank ${bank.uid}, and bank account number ${bankAccountNumberPublic} has already been added.`,
      )
      throw new Error('Bank account has already been added.')
    }

    // Verify and resolve bank information
    const response = await this.paystackService.resolveAccountNumber({
      accountNumber: bankAccountNumber,
      bankCode: bank.bankCode,
    })

    if (!response.status || !response.data) {
      await this.userBaNameMatchLogService.create(
        userDetails.userId,
        UserBaNameMatchLogSourceEnum.AddBankAccount,
        userDetails,
        {
          bankAccountNumber: payload.bankAccountNumber,
          bankCode: bank.bankCode,
          bankId: bank.id,
        },
        response,
      )

      this.logger.info(`Unable to resolve account for user ${user.uid}. Paystack Message: ${response.message}`)
      throw new Error('Unable to resolve user bank account')
    }

    // If we don't have the full name and we don't have the user name from the request, throw an error
    if (!userDetails.fullName && !userName) {
      throw new Error(`The user's full name is required when adding a new bank account`)
    }

    const userFullName = userDetails.fullName ? userDetails.fullName : userName!

    // Verify the user provided (or already has) a user name and it matches that on the bank account
    const userNameMatchResult = this.userFullNameService.match(userFullName, response.data.accountName)

    await this.userBaNameMatchLogService.create(
      userDetails.userId,
      UserBaNameMatchLogSourceEnum.AddBankAccount,
      userDetails,
      {
        bankAccountNumber: payload.bankAccountNumber,
        bankCode: bank.bankCode,
        bankId: bank.id,
      },
      response,
      userNameMatchResult,
    )

    if (!userNameMatchResult.match) {
      throw new Error('Name in user profile does not match the account holder name')
    }

    // Save the user bank account
    const bankAccount = await this.userBankAccEntityService.addOne({
      userId: user.id,
      bankId: bank.id,
      bankAccountNumber: bankAccountNumber,
      bankAccountName: this.normalizeAccountName(response.data.accountName),
      bankAccountNumberPublic: bankAccountNumberPublic,
    })

    // Save the user bank account configuration
    await this.userBankAccConfigEntityService.addOne({
      userBankId: bankAccount.id,
      isDeleted: false,
    })

    // If the user has not set their name yet, update it
    // TODO: move decision logic to user level service and decide by user level, not by username
    if (!userDetails.fullName) {
      const accountName = this.normalizeAccountName(response.data.accountName)

      await this.userDetailsEntityService.updateOne({
        userId: user.id,
        fullName: accountName,
        updatedBy: null,
      })
    }

    await this.userLevelService.triggerLevelPromotion(user.id, UserLevel.Level1)

    return bankAccount
  }

  async validate(user: UserModel, bank: BankModel, payload: BankAccountInput): Promise<ValidateUserBankAccountOutput> {
    const { bankAccountNumber } = payload

    const existingUserBankAccount = await this.getUserBankAccountExists(user.id, bank.id, bankAccountNumber)
    if (existingUserBankAccount) {
      return {
        status: UserBankAccountValidationStatus.Invalid,
        reason: 'Bank account has already been added',
      }
    }

    const userDetails = await this.userDetailsEntityService.getOne({ userId: user.id })
    if (!userDetails) {
      throw new Error('Unexpected error: user has no user details')
    }

    const response = await this.paystackService.resolveAccountNumber({
      accountNumber: bankAccountNumber,
      bankCode: bank.bankCode,
    })

    if (!response?.status || !response?.data) {
      await this.userBaNameMatchLogService.create(
        userDetails.userId,
        UserBaNameMatchLogSourceEnum.Validate,
        userDetails,
        {
          bankAccountNumber: payload.bankAccountNumber,
          bankCode: bank.bankCode,
          bankId: bank.id,
        },
        response,
      )

      return {
        status: UserBankAccountValidationStatus.Invalid,
        reason: 'We could not find this account. Please verify the account number and try again',
      }
    }

    // old logic when the user was registering without providing personal info
    // if there is no full name we would need to throw an error
    if (!userDetails.fullName) {
      const accountName = this.normalizeAccountName(response.data.accountName)

      return {
        status: UserBankAccountValidationStatus.RequireConfirmation,
        fullName: accountName,
      }
    }
    // -----

    const userNameMatchResult = this.userFullNameService.match(userDetails.fullName, response.data.accountName)

    await this.userBaNameMatchLogService.create(
      userDetails.userId,
      UserBaNameMatchLogSourceEnum.Validate,
      userDetails,
      {
        bankAccountNumber: payload.bankAccountNumber,
        bankCode: bank.bankCode,
        bankId: bank.id,
      },
      response,
      userNameMatchResult,
    )

    if (!userNameMatchResult.match) {
      return {
        status: UserBankAccountValidationStatus.Invalid,
        reason: "Account doesn't belong to registered user",
        reasonCode: ReasonCode.NoMatch,
      }
    }

    return { status: UserBankAccountValidationStatus.Valid }
  }

  async delete(user: UserModel, uid: string): Promise<void> {
    const userBankAcc = await this.userBankAccEntityService.getOne({ uid: uid, userId: user.id })

    if (!userBankAcc) {
      throw new Error('User bank account not found')
    }

    await this.userBankAccConfigEntityService.updateOne({
      userBankId: userBankAcc.id,
      isDeleted: true,
    })
  }

  async batchDelete(user: UserModel, uids: string[]): Promise<void> {
    const userBankAccs = await this.userBankAccEntityService
      .select()
      .where(x => x.userId.eq(user.id))
      .where(x => x.uid.in(uids))
      .fetch(UserBankAccountModel)

    if (!userBankAccs || !userBankAccs.length) {
      throw new Error('User bank account not found')
    }

    const bankIdsToDelete = userBankAccs.map(x => x.id)

    await this.userBankAccConfigEntityService.update({ isDeleted: true }, x => x.userBankId.in(bankIdsToDelete))
  }

  async existingUserBankAccountMatch(userId: number, newFullName: string): Promise<FullNameMatchResult> {
    const userDetails = await this.userDetailsEntityService.getOne({ userId })
    if (!userDetails) {
      throw new NotFoundError('User details are not found')
    }

    if (userDetails.fullName) {
      const userNameMatchResult = this.userFullNameService.match(userDetails.fullName, newFullName)

      return userNameMatchResult
    } else {
      // no full name in user details -> no bank account added before -> matching is success by default
      return {
        match: true,
        matchReason: {
          reason: 'no bank account added',
        },
      }
    }
  }

  async anyBankAccountExists(user: UserModel): Promise<boolean> {
    return this.userBankAccEntityService
      .select()
      .where(x => x.userId.eq(user.id))
      .exists()
  }

  async addUserBankAccountFromLog(bankNameMatchLogId: number, createdBy: string): Promise<UserBankAccountModel> {
    const bankAccountLog = await this.userBaNameMatchLogEntityService.getOne({ id: bankNameMatchLogId })
    if (!bankAccountLog) {
      this.logger.error(`unexpected: Bank account matching logs with ID ${bankNameMatchLogId} not found`)
      throw new Error('Bank account name matching log not found.')
    }

    const { userId, bankAccountDetails, response } = bankAccountLog
    if (!bankAccountDetails) {
      this.logger.error(
        `unexpected: bank account details not found for bank account match log ID ${bankNameMatchLogId}`,
      )
      throw new Error(`User bank account details not found.`)
    }

    const { bankAccountNumber, bankId } = bankAccountDetails
    if (isNil(bankAccountNumber) || isNil(bankId)) {
      this.logger.error(
        `unexpected: bank number or bank id not found for bank account match log ID ${bankNameMatchLogId}`,
      )
      throw new Error(`User bank account details not found.`)
    }

    // Format the public bank account number
    const bankAccountNumberPublic = this.formatPublicAccountNumber(bankAccountNumber)

    const existingUserBankAccount = await this.getUserBankAccountExists(userId, bankId, bankAccountNumber)
    if (existingUserBankAccount) {
      this.logger.info(
        `Bank account for user ${userId}, bank ${bankId}, and bank account number ${bankAccountNumberPublic} has already been added.`,
      )
      throw new Error('Bank account has already been added.')
    }

    const accountName = response?.data?.accountName ? this.normalizeAccountName(response.data.accountName) : null

    // Save the user bank account
    const bankAccount = await this.userBankAccEntityService.addOne({
      userId: userId,
      bankId: bankId,
      bankAccountNumber: bankAccountNumber,
      bankAccountName: accountName,
      bankAccountNumberPublic: bankAccountNumberPublic,
      createdBy: createdBy,
    })

    // Save the user bank account configuration
    await this.userBankAccConfigEntityService.addOne({
      userBankId: bankAccount.id,
      isDeleted: false,
    })

    await this.userLevelService.triggerLevelPromotion(userId, UserLevel.Level1)

    return bankAccount
  }

  private getUserBankAccountExists(userId: number, bankId: number, bankAccountNumber: string): Promise<boolean> {
    return this.userBankAccEntityService
      .select()
      .join(UserBankAccountConfigModel, (root, other) => root.id.eq(other.userBankId))
      .where(x => x.userId.eq(userId))
      .where(x => x.bankAccountNumber.eq(bankAccountNumber))
      .where(x => x.bankId.eq(bankId))
      .where(x => of(UserBankAccountConfigModel, 'isDeleted').eq(false))
      .exists()
  }

  private normalizeAccountName(fullName: string): string {
    // remove multiple spaces from name
    const name = fullName.replace(/\s+/g, ' ').trim()

    return utils.toTitleCase(name)
  }

  private formatPublicAccountNumber(accountNumber: string): string {
    return accountNumber.replace(/.(?=.{4,}$)/g, '*')
  }
}
