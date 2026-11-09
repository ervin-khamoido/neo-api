2021

export enum UserActionType {
  PO = 'po',
  SO = 'so',
  Send = 'send',
  Receive = 'receive',
}

export interface IActionLimit {
  actionType: UserActionType
  oneDayLimitUsdc?: number | null
  sevenDayLimitUsdc?: number | null
  thirtyDayLimitUsdc?: number | null
  complianceTransactionLimitUsdc?: number | null
  combinedTurnoverLimitUsdc?: number | null
  timestamp: Date
}
