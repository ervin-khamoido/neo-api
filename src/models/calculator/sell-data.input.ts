2021

import { IFeeConfig } from '../../services/fee-calculator.service'

export interface ISellUsdcData {
  amount: number
  amountUsdc: number
}

export interface ISellUsdcConfig {
  // feeMultiplier: number
  // agentFee: number
  feeConfig: IFeeConfig
  exchangeRate: number
}
