2021

import { Currency } from '../db'

export interface ICreateTransactionInput {
  parentTransactionId?: number | null
  orderId: number
  source: string
  dest: string
  currency: Currency
  amount: number
  createdBy: string
  lockVersion?: number
  description?: string | null
}
