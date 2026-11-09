2021

import { Currency, TransactionStatus } from '../db'

export interface IAddTransactionInput {
  parentTransactionId?: number
  orderId: number
  source: string
  dest: string
  currency: Currency
  amount: number
  createdBy: string
}

export interface IAddTransactionStatusInput {
  status: TransactionStatus
  statusReason?: string | null
  modernTreasuryTransactionId?: string | null
  modernTreasuryStatus?: string | null
  modernTreasuryPayload?: object | null
  totalFees?: number | null
}
