interface TxInfo {
  nonce: number
  gasLimit: string
  value: string
  data: string
  id: string
  to: string
  v: string
  chainId: string
  _type: string
  gasPrice: string
}

interface FeeInfo {
  date: string
  gasPrice: string
  baseFee: string
  gasUsedRatio: string
  safeLowMinerTip: string
  normalMinerTip: string
  standardMinerTip: string
  fastestMinerTip: string
  ludicrousMinerTip: string
}

interface Recipient {
  amount: string
  address: string
}

export interface PrebuiltTransactionOutput {
  txHex: string
  txInfo: TxInfo
  feeInfo: FeeInfo
  nextContractSequenceId: number
  recipients: Recipient[]

  gasPrice: number
  gasLimit: number
  coin: string
  walletId: string
  walletContractAddress: string
}
