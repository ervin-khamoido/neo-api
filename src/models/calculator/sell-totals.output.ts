2021

import { IFeeResult } from '../../services/fee-calculator.service'

export interface ISellUsdcCalculationsOutput {
  amountUsdc: number
  calculatedTotal: number
  calculatedPurchaseAmount: number
  fee: IFeeResult
}
