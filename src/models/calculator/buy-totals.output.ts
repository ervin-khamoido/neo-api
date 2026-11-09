2021

import { IFeeResult } from '../../services/fee-calculator.service'

export interface IBuyUsdcCalculationsOutput {
  amount: number
  calculatedTotal: number
  calculatedTotalUsdc: number
  fee: IFeeResult
}
