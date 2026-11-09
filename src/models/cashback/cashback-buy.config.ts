2021

export type ICashbackBuyConfig = ICashbackBuyConfigV1

export interface ICashbackBuyConfigV1 {
  enabled: boolean
  externalUid: string
  maxWinAmountValue: number
  winPercentage: number
  maxWinAmountPercentage: number
  minWinAmountPercentage: number
  createdDate: Date
  updatedDate: Date

  startDate: Date
  endDate: Date

  version: 'v1'
}
