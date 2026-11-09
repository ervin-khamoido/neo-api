2021

import { OrderStatusModel } from '../db'
import { ITransactionStatusChangeResult } from '../transaction'

export interface IOrderConfirmationResult {
  orderStatus: OrderStatusModel | null
  transactionStatusChangeResult: ITransactionStatusChangeResult
}
