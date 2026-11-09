2021

import { TransactionStatusModel } from '../db'

export interface ITransactionStatusChangeResult {
  transactionStatus: TransactionStatusModel
  changed: boolean
}
