2021

import { readable } from '@ts-awesome/model-reader'

export interface IUserOrderCountOutput {
  totalOpenOrderCount: number
  openPurchaseOrderCount: number
  openSellOrderCount: number
}
