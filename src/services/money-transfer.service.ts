2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { ConflictError, ForbiddenError } from '../errors'

import { UserLevel, UserLevelOrder } from '../models/db'
import { IActionApproval, UserActionType, ActionApprovalResult } from '../models/limits'

import { UserStatusServiceSymbol, IUserStatusService } from './user-status.service'
import { IUserLevelService, UserLevelServiceSymbol } from './level/user-level.service'
import { IUserLimitService, UserLimitServiceSymbol } from './user-limit.service'

export interface IMoneyTransferService {
  verifyUserCanSendAmount(userId: number, amountUsdc: number): Promise<IActionApproval>
  verifyUserCanReceiveAmount(userId: number, amountUsdc: number): Promise<IActionApproval>
}

export const MoneyTransferServiceSymbol = Symbol.for('IMoneyTransferService')

@injectable()
export class MoneyTransferService implements IMoneyTransferService {
  @inject(UserStatusServiceSymbol) userStatusService!: IUserStatusService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService
  @inject(UserLimitServiceSymbol) userLimitService!: IUserLimitService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(MoneyTransferService)
  }

  /**
   * Verifies if the user can send the requested amount.
   * NOTE: The action approval object is needed for the lock version on the user balance.
   * @param userId The user ID
   * @param amountUsdc The amount in USDC to send
   * @returns Throws an error if they cannot send the amount. If they can send the amount, it returns the action approval.
   */
  async verifyUserCanSendAmount(userId: number, amountUsdc: number): Promise<IActionApproval> {
    // Verify user can create transfer orders
    const userCanTransferMoney = await this.canUserTransferMoney(userId)
    if (!userCanTransferMoney) {
      throw new ForbiddenError(`User account is not eligible to transfer money.`)
    }

    // Verify action approval for send
    const actionApproval = await this.verifySendActionIsApproved(userId, amountUsdc)

    return actionApproval
  }

  /**
   * Verifies if the user can receive the requested amount.
   * NOTE: The action approval object is needed for the lock version on the user balance.
   * @param userId The user ID
   * @param amountUsdc The amount in USDC to send
   * @returns Throws an error if they cannot send the amount. If they can send the amount, it returns the action approval.
   */
  async verifyUserCanReceiveAmount(userId: number, amountUsdc: number): Promise<IActionApproval> {
    // Verify user can create transfer orders
    const userCanTransferMoney = await this.canUserTransferMoney(userId)
    if (!userCanTransferMoney) {
      throw new ForbiddenError(`User account is not eligible to transfer money.`)
    }

    // Verify action approval for send
    const actionApproval = await this.verifyReceiveActionIsApproved(userId, amountUsdc)

    return actionApproval
  }

  /**
   * Checks if a user account is eligible to transfer money.
   * Checks for: active status, verified KYC level
   * @param userId The user ID
   * @returns True if they are allowed to transfer money, false otherwise
   */
  private async canUserTransferMoney(userId: number): Promise<boolean> {
    // Check if the user is in an active status (aka not blocked, deleted, etc.)
    const userIsActive = await this.userStatusService.isUserActive(userId)
    if (!userIsActive) {
      this.logger.error(`User [ID: ${userId}] account is not in an active status`)

      return false
    }

    // Check if the user account is verified (aka KYC level 2+)
    const isEligibleUserLevel = await this.isUserLevelAllowed(userId)
    if (!isEligibleUserLevel) {
      return false
    }

    return true
  }

  private async isUserLevelAllowed(userId: number): Promise<boolean> {
    const { current } = await this.userLevelService.getUserLevel(userId)

    // If the user level is less than 2 (meaning KYC has not been verified/completed), throw an error
    if (UserLevelOrder[current.code] < UserLevelOrder[UserLevel.Level2]) {
      this.logger.error(`unexpected: user level ${current.code} cannot create transfers`)

      return false
    }

    return true
  }

  private async verifySendActionIsApproved(senderId: number, amount: number): Promise<IActionApproval> {
    const actionApproval = await this.userLimitService.getActionApproval(senderId, UserActionType.Send, amount)

    // If the user action is not approved it means the user exceeded their limit, throw an error
    if (actionApproval.result !== ActionApprovalResult.Approved) {
      this.logger.error(`conflict: the amount [${amount}] exceeded the user's limit`)

      throw new ConflictError(`The amount exceeded the user's limit`)
    }

    return actionApproval
  }

  private async verifyReceiveActionIsApproved(senderId: number, amount: number): Promise<IActionApproval> {
    const actionApproval = await this.userLimitService.getActionApproval(senderId, UserActionType.Receive, amount)

    // If the user action is not approved it means the user exceeded their limit, throw an error
    if (actionApproval.result !== ActionApprovalResult.Approved) {
      this.logger.error(`conflict: the amount [${amount}] exceeded the user's limit`)

      throw new ConflictError(`The amount exceeded the user's limit`)
    }

    return actionApproval
  }
}
