2021

import { LockedAmountResult } from '../wallet/locked-amount.result'
import { UserActionType } from './action-limit'

export interface IUsedActionLimitTotals {
  actionType: UserActionType
  oneDayTotalUsdc?: number
  sevenDayTotalUsdc?: number
  thirtyDayTotalUsdc?: number
  combinedTurnoverUsdc?: number
  balanceTotalUsdc: LockedAmountResult | null
  timestamp: Date
}
