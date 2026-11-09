import { ICashbackBuyConfig } from './cashback-buy.config'
import { RewardType } from '../db'

export type RewardOrderCashbackDetails = IRewardOrderCashbackDetailsV1

export interface IRewardOrderCashbackDetailsV1 {
  type: RewardType.Cashback_Buy
  version: 'v1'
  config: ICashbackBuyConfig
  calculatedWinAmountPercentage: number
  amount: number
  totalUsdc: number
  cashbackUsdc: number
  isEligibleRandomValueGenerated: number
  referenceNumber: string
}

export interface IPOCashbackCalculatorDetails extends ICashbackBuyConfig {}
