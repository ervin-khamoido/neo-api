2021

import { UserActionType } from './action-limit'

export enum ActionApprovalResult {
  Approved = 'approved',
  Rejected = 'rejected',
  Empty = 'empty',
}

export interface IActionApproval {
  actionType: UserActionType
  result: ActionApprovalResult
  reason?: string | null
  lockVersion: number | null
  timestamp: Date
}
