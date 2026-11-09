2021

export interface IOnChainCalculationsResult {
  amountUsdc: number
  totalUsdc: number
  exchangeRate: number
  feeResult: IOnChainFeeResult

  baseCoin: string
  toAddress: string

  txRef: string
  txPrebuilt: any
  coin: string
  amount: string
  amountRaw: string
  fee: string
  feeRaw: string
}

export interface IOnChainFeeConfig {
  percentageFee: number | null
  flatFee: number | null
  maxFee: number | null
  minFee: number | null
}

export interface IOnChainFeeResult {
  totalFeeUsdc: number
  networkFeeUsdc: number
  neoBankFeeUsdc: number
}
