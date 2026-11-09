2021

import { inject, injectable } from 'inversify'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { startOfDay, subDays } from 'date-fns'
import currency from 'currency.js'
import { isNil } from 'lodash'

import { nameOfFactory } from '../utils/nameof-factory'

import {
  ActionApprovalResult,
  IActionApproval,
  IActionLimit,
  IMaxAvailableActionLimit,
  IRemainingActionLimits,
  IUsedActionLimitTotals,
  MaxLimitReason,
  UserActionType,
} from '../models/limits'

import { IUserOrderService, UserOrderServiceSymbol } from './user-order.service'
import { IUserLevelLimitService, UserLevelLimitServiceSymbol } from './user-level-limit.service'
import { USDC_PRECISION_CONFIG } from './calculator.service'
import { IUserBalanceService, UserBalanceServiceSymbol } from './user-balance.service'

export interface IUserLimitService {
  getMaxAvailableActionLimit(userId: number, actionType: UserActionType): Promise<IMaxAvailableActionLimit>
  getMaxAvailableActionLimits(userId: number): Promise<IMaxAvailableActionLimit[]>

  getActionApproval(userId: number, actionType: UserActionType, amount: number): Promise<IActionApproval>
}

export const UserLimitServiceSymbol = Symbol.for('IUserLimitService')

@injectable()
export class UserLimitService implements IUserLimitService {
  @inject(UserLevelLimitServiceSymbol) userLevelLimitService!: IUserLevelLimitService
  @inject(UserOrderServiceSymbol) userOrderService!: IUserOrderService
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserLimitService)
  }

  /**
   * Gets the max available action limit for a user and a specific action type.
   * Max available limits are the max amount a user can still use for a specific action type.
   * @param userId The ID of the user
   * @param actionType The action type (po, so, etc.)
   * @returns An array containing the max limit per action type.
   */
  async getMaxAvailableActionLimit(userId: number, actionType: UserActionType): Promise<IMaxAvailableActionLimit> {
    const date = new Date()

    const remainingActionLimits = await this.getRemainingActionLimits(userId, actionType)

    // Calculate max limit
    const maxLimitAmount = Math.min(
      remainingActionLimits.remainingBalanceUsdc,
      remainingActionLimits.oneDayRemainingUsdc,
      remainingActionLimits.sevenDayRemainingUsdc,
      remainingActionLimits.thirtyDayRemainingUsdc,
      remainingActionLimits.combinedTurnoverRemainingUsdc,
    )

    // Identify max limit reason
    const reason = await this.getMaxLimitReason(remainingActionLimits, maxLimitAmount)

    const maxLimit: IMaxAvailableActionLimit = {
      actionType: remainingActionLimits.actionType,
      maxLimit: maxLimitAmount,
      policy: null,
      reason: reason,
      lockVersion: remainingActionLimits.lockVersion,
      timestamp: date,
    }

    return maxLimit
  }

  /**
   * Gets the max available action limits for a user and all action types.
   * Max available limits are the max amount a user can still use for a specific action type.
   * @param userId The ID of the user
   * @returns An array containing the max limit per action type.
   */
  async getMaxAvailableActionLimits(userId: number): Promise<IMaxAvailableActionLimit[]> {
    const actionTypes = [UserActionType.PO, UserActionType.SO, UserActionType.Send, UserActionType.Receive]

    const maxAvailableActionLimits: IMaxAvailableActionLimit[] = []
    for (const actionType of actionTypes) {
      const maxLimit = await this.getMaxAvailableActionLimit(userId, actionType)

      maxAvailableActionLimits.push(maxLimit)
    }

    return maxAvailableActionLimits
  }

  /**
   * Determines if a user can perform a specific action type based on their max limit and the amount of the requested transaction.
   * @param userId The ID of the user
   * @param actionType The action type (po, so, etc.)
   * @param amount The amount of the requested tranasction (aka the amount to be saved, withdrawn, etc.)
   * @returns An array containing the max limit per action type.
   */
  async getActionApproval(userId: number, actionType: UserActionType, amount: number): Promise<IActionApproval> {
    const timestamp = new Date()
    let result = null
    let reason = null

    const maxAvailableActionLimit = await this.getMaxAvailableActionLimit(userId, actionType)

    const amountUsdc = currency(amount, { precision: USDC_PRECISION_CONFIG.decimalPlaces })
    const maxLimitUsdc = currency(maxAvailableActionLimit.maxLimit, { precision: USDC_PRECISION_CONFIG.decimalPlaces })

    if (amountUsdc.value > maxLimitUsdc.value) {
      result = ActionApprovalResult.Rejected
      reason = maxAvailableActionLimit.reason
    } else {
      result = ActionApprovalResult.Approved
      reason = null
    }

    const actionApproval: IActionApproval = {
      actionType,
      result,
      reason,
      timestamp,
      // just pass through the lock version, let the underlying service decide when it should be set
      lockVersion: maxAvailableActionLimit.lockVersion,
    }

    return actionApproval
  }

  /**
   * Gets limits for a specific user action.
   * @param userId The ID of the user
   * @param actionType The action type (po, so, etc.)
   * @returns The action limits
   */
  private async getActionLimits(userId: number, actionType: UserActionType): Promise<IActionLimit> {
    switch (actionType) {
      case UserActionType.PO: {
        const actionLimit = await this.getPOActionLimits(userId)
        return actionLimit
      }
      case UserActionType.SO: {
        const actionLimit = await this.getSOActionLimits(userId)
        return actionLimit
      }
      case UserActionType.Send: {
        const actionLimit = await this.getSendActionLimits(userId)
        return actionLimit
      }
      case UserActionType.Receive: {
        const actionLimit = await this.getReceiveActionLimits(userId)
        return actionLimit
      }
      default: {
        throw new Error(`critical: could not create action limits for action type: ${actionType}`)
      }
    }
  }

  /**
   * Gets the used action limit totals for a user and a specific action.
   * Used action limit totals are the totals of how much the user has "used" (aka saved, withdrew, etc) per limit and action type.
   * @param userId The ID of the user
   * @param actionType The action type (po, so, etc.)
   * @returns An array containing the max limit per action type.
   */
  private async getUsedActionLimitTotals(userId: number, actionType: UserActionType): Promise<IUsedActionLimitTotals> {
    const actionLimits = await this.getActionLimits(userId, actionType)

    const usedActionLimitTotals: IUsedActionLimitTotals = {
      actionType: actionType,
      timestamp: actionLimits.timestamp,
      balanceTotalUsdc: null,
    }

    const startOfDayToday = startOfDay(actionLimits.timestamp) // today
    const startOfDaySevenDayPeriod = subDays(startOfDayToday, 6) // today + 6 previous days = 7
    const startOfDayThirtyDayPeriod = subDays(startOfDayToday, 29) // today + 29 previous days = 30

    // get only orders required for 1, 7, and 30 days calculations
    const maxEndDateForPeriod = startOfDayThirtyDayPeriod
    const orders = await this.userOrderService.getOpenAndCompletedOrdersByActionType(
      userId,
      actionType,
      maxEndDateForPeriod,
    )

    // calculate total of orders for one day
    if (!isNil(actionLimits.oneDayLimitUsdc)) {
      const calculatedTotal = await this.userOrderService.calculateOrdersTotal(orders, startOfDayToday)
      usedActionLimitTotals.oneDayTotalUsdc = calculatedTotal
    }

    // calculate total of orders for seven days
    if (!isNil(actionLimits.sevenDayLimitUsdc)) {
      const calculatedTotal = await this.userOrderService.calculateOrdersTotal(orders, startOfDaySevenDayPeriod)
      usedActionLimitTotals.sevenDayTotalUsdc = calculatedTotal
    }

    // calculate total of orders for thirty days
    if (!isNil(actionLimits.thirtyDayLimitUsdc)) {
      const calculatedTotal = await this.userOrderService.calculateOrdersTotal(orders, startOfDayThirtyDayPeriod)
      usedActionLimitTotals.thirtyDayTotalUsdc = calculatedTotal
    }

    // calculate total receives + deposits
    if (!isNil(actionLimits.combinedTurnoverLimitUsdc)) {
      const combinedCalculatedTotalUsdc = await this.userOrderService.getSumOfOrdersForCombinedTurnover(userId)
      usedActionLimitTotals.combinedTurnoverUsdc = combinedCalculatedTotalUsdc
    }

    // get balance for the action types that require it
    const actionTypesForBalanceCheck = [UserActionType.SO, UserActionType.Send]
    if (actionTypesForBalanceCheck.includes(actionType)) {
      const userBalance = await this.userBalanceService.getUserBalance(userId)
      usedActionLimitTotals.balanceTotalUsdc = {
        amount: userBalance.balance,
        lockVersion: userBalance.lockVersion,
      }
    }

    return usedActionLimitTotals
  }

  /**
   * Gets the remaining limits for a user and a specific action.
   * Remaining action limits are the amounts a user can still use per limit and action type.
   * @param userId The ID of the user
   * @param actionType The action type (po, so, etc.)
   * @returns An array containing the max limit per action type.
   */
  private async getRemainingActionLimits(userId: number, actionType: UserActionType): Promise<IRemainingActionLimits> {
    const actionLimits = await this.getActionLimits(userId, actionType)
    const usedActionLimitTotals = await this.getUsedActionLimitTotals(userId, actionType)

    const remainingActionLimits: IRemainingActionLimits = {
      actionType: actionType,
      oneDayRemainingUsdc: Infinity,
      sevenDayRemainingUsdc: Infinity,
      thirtyDayRemainingUsdc: Infinity,
      combinedTurnoverRemainingUsdc: Infinity,
      remainingBalanceUsdc: Infinity,
      lockVersion: null,
      timestamp: actionLimits.timestamp,
    }

    // calculate remaining amount for one day limit
    if (!isNil(actionLimits.oneDayLimitUsdc)) {
      remainingActionLimits.oneDayRemainingUsdc = currency(actionLimits.oneDayLimitUsdc, {
        precision: USDC_PRECISION_CONFIG.decimalPlaces,
      }).subtract(usedActionLimitTotals?.oneDayTotalUsdc ?? 0).value

      // Do not return negative numbers because this is a user facing feature. If you need negative numbers consider creating a different method.
      if (remainingActionLimits.oneDayRemainingUsdc < 0) {
        this.logger.warn('unexpected: oneDayRemainingUsdc is < 0')
        remainingActionLimits.oneDayRemainingUsdc = 0
      }
    }

    // calculate remaining amount for seven days limit
    if (!isNil(actionLimits.sevenDayLimitUsdc)) {
      remainingActionLimits.sevenDayRemainingUsdc = currency(actionLimits.sevenDayLimitUsdc, {
        precision: USDC_PRECISION_CONFIG.decimalPlaces,
      }).subtract(usedActionLimitTotals?.sevenDayTotalUsdc ?? 0).value

      // Do not return negative numbers because this is a user facing feature. If you need negative numbers consider creating a different method.
      if (remainingActionLimits.sevenDayRemainingUsdc < 0) {
        this.logger.warn('unexpected: sevenDayRemainingUsdc is < 0')
        remainingActionLimits.sevenDayRemainingUsdc = 0
      }
    }

    // calculate remaining amount for thirty days limit
    if (!isNil(actionLimits.thirtyDayLimitUsdc)) {
      remainingActionLimits.thirtyDayRemainingUsdc = currency(actionLimits.thirtyDayLimitUsdc, {
        precision: USDC_PRECISION_CONFIG.decimalPlaces,
      }).subtract(usedActionLimitTotals?.thirtyDayTotalUsdc ?? 0).value

      // Do not return negative numbers because this is a user facing feature. If you need negative numbers consider creating a different method.
      if (remainingActionLimits.thirtyDayRemainingUsdc < 0) {
        this.logger.warn('unexpected: thirtyDayRemainingUsdc is < 0')
        remainingActionLimits.thirtyDayRemainingUsdc = 0
      }
    }

    // calculate remaining amount for combined turnover limit
    if (!isNil(actionLimits.combinedTurnoverLimitUsdc)) {
      remainingActionLimits.combinedTurnoverRemainingUsdc = currency(actionLimits.combinedTurnoverLimitUsdc, {
        precision: USDC_PRECISION_CONFIG.decimalPlaces,
      }).subtract(usedActionLimitTotals?.combinedTurnoverUsdc ?? 0).value

      // Do not return negative numbers because this is a user facing feature. If you need negative numbers consider creating a different method.
      if (remainingActionLimits.combinedTurnoverRemainingUsdc < 0) {
        this.logger.warn('unexpected: combinedTurnoverRemainingUsdc is < 0')
        remainingActionLimits.combinedTurnoverRemainingUsdc = 0
      }
    }

    // calculate remaining balance amount for SO/Send
    const actionTypesForBalanceCheck = [UserActionType.SO, UserActionType.Send]
    if (actionTypesForBalanceCheck.includes(actionType)) {
      remainingActionLimits.remainingBalanceUsdc = usedActionLimitTotals.balanceTotalUsdc?.amount ?? 0
      remainingActionLimits.lockVersion = usedActionLimitTotals.balanceTotalUsdc?.lockVersion ?? null

      // Do not return negative numbers because this is a user facing feature. If you need negative numbers consider creating a different method.
      if (remainingActionLimits.remainingBalanceUsdc < 0) {
        this.logger.warn('unexpected: remainingBalanceUsdc is < 0')
        remainingActionLimits.remainingBalanceUsdc = 0
      }
    }

    return remainingActionLimits
  }

  private async getPOActionLimits(userId: number): Promise<IActionLimit> {
    const userLevelLimits = await this.userLevelLimitService.getUserLevelLimits(userId)
    if (!userLevelLimits) {
      throw new Error(`critical: could not find user level limits`)
    }

    const actionLimit: IActionLimit = {
      actionType: UserActionType.PO,
      oneDayLimitUsdc: userLevelLimits?.buy1DayLimitUsdc,
      sevenDayLimitUsdc: userLevelLimits?.buy7DayLimitUsdc,
      thirtyDayLimitUsdc: userLevelLimits?.buy30DayLimitUsdc,
      complianceTransactionLimitUsdc: null,
      combinedTurnoverLimitUsdc: userLevelLimits?.combinedTurnoverLimitUsdc,
      timestamp: new Date(),
    }

    return actionLimit
  }

  private async getSOActionLimits(userId: number): Promise<IActionLimit> {
    const userLevelLimits = await this.userLevelLimitService.getUserLevelLimits(userId)
    if (!userLevelLimits) {
      throw new Error(`critical: could not find user level limits`)
    }

    const actionLimit: IActionLimit = {
      actionType: UserActionType.SO,
      oneDayLimitUsdc: userLevelLimits?.sell1DayLimitUsdc,
      sevenDayLimitUsdc: userLevelLimits?.sell7DayLimitUsdc,
      thirtyDayLimitUsdc: userLevelLimits?.sell30DayLimitUsdc,
      complianceTransactionLimitUsdc: null,
      combinedTurnoverLimitUsdc: null,
      timestamp: new Date(),
    }

    return actionLimit
  }

  private async getSendActionLimits(userId: number): Promise<IActionLimit> {
    const userLevelLimits = await this.userLevelLimitService.getUserLevelLimits(userId)
    if (!userLevelLimits) {
      throw new Error(`critical: could not find user level limits`)
    }

    const actionLimit: IActionLimit = {
      actionType: UserActionType.Send,
      oneDayLimitUsdc: userLevelLimits?.send1DayLimitUsdc,
      sevenDayLimitUsdc: userLevelLimits?.send7DayLimitUsdc,
      thirtyDayLimitUsdc: userLevelLimits?.send30DayLimitUsdc,
      complianceTransactionLimitUsdc: userLevelLimits?.sendComplianceTransactionLimitUsdc,
      combinedTurnoverLimitUsdc: null,
      timestamp: new Date(),
    }

    return actionLimit
  }

  private async getReceiveActionLimits(userId: number): Promise<IActionLimit> {
    const userLevelLimits = await this.userLevelLimitService.getUserLevelLimits(userId)
    if (!userLevelLimits) {
      throw new Error(`critical: could not find user level limits`)
    }

    const actionLimit: IActionLimit = {
      actionType: UserActionType.Receive,
      oneDayLimitUsdc: userLevelLimits?.receive1DayLimitUsdc,
      sevenDayLimitUsdc: userLevelLimits?.receive7DayLimitUsdc,
      thirtyDayLimitUsdc: userLevelLimits?.receive30DayLimitUsdc,
      complianceTransactionLimitUsdc: userLevelLimits?.receiveComplianceTransactionLimitUsdc,
      combinedTurnoverLimitUsdc: userLevelLimits?.combinedTurnoverLimitUsdc,
      timestamp: new Date(),
    }

    return actionLimit
  }

  /**
   * Gets the max available action limits for a user.
   * Max available limits are the max amount a user can still use for a specific action type.
   * @param userId The ID of the user
   * @returns An array containing the max limit per action type.
   */
  private async getMaxLimitReason(
    remainingLimit: IRemainingActionLimits,
    maxLimitAmount: number,
  ): Promise<MaxLimitReason | null> {
    for (const [key, value] of Object.entries(RemainingLimitKeyToMaxLimitReason)) {
      if (remainingLimit[key] === maxLimitAmount) {
        return value.reason
      }
    }

    return null
  }
}

const nameOfRemainingActionLimit = nameOfFactory<IRemainingActionLimits>()
const RemainingLimitKeyToMaxLimitReason: Record<string, { order: number; reason: MaxLimitReason }> = Object.freeze({
  [nameOfRemainingActionLimit('remainingBalanceUsdc')]: { order: 1, reason: MaxLimitReason.BalanceLimit },
  [nameOfRemainingActionLimit('combinedTurnoverRemainingUsdc')]: {
    order: 2,
    reason: MaxLimitReason.CombinedTurnoverLimit,
  },
  [nameOfRemainingActionLimit('thirtyDayRemainingUsdc')]: { order: 3, reason: MaxLimitReason.ThirtyDayLimit },
  [nameOfRemainingActionLimit('sevenDayRemainingUsdc')]: { order: 4, reason: MaxLimitReason.SevenDayLimit },
  [nameOfRemainingActionLimit('oneDayRemainingUsdc')]: { order: 5, reason: MaxLimitReason.OneDayLimit },
})
