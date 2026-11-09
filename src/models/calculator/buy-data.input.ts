2021

import { IFeeConfig } from '../../services/fee-calculator.service'

export interface IBuyUsdcData {
  amount: number
  total?: number
  totalUsdc?: number
}

export interface IBuyUsdcConfig {
  feeConfig: IFeeConfig
  exchangeRate: number
}
