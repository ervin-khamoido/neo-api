2021

import { UserActionType } from './action-limit'

export interface IMaxAvailableActionLimit {
  actionType: UserActionType
  maxLimit: number
  reason?: string | null
  policy?: string | null
  lockVersion: number | null
  timestamp: Date
}

export enum MaxLimitReason {
  OneDayLimit = 'limit.1day',
  SevenDayLimit = 'limit.7day',
  ThirtyDayLimit = 'limit.30day',
  CombinedTurnoverLimit = 'limit.combined_turnover',
  ComplianceTransactionLimit = 'limit.compliance_transaction_limit',
  BalanceLimit = 'limit.balance',
}
