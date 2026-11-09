2021

import { UserActionType } from './action-limit'

export interface IRemainingActionLimits {
  actionType: UserActionType
  oneDayRemainingUsdc: number
  sevenDayRemainingUsdc: number
  thirtyDayRemainingUsdc: number
  combinedTurnoverRemainingUsdc: number
  remainingBalanceUsdc: number
  lockVersion: number | null
  timestamp: Date
}
