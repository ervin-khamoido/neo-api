2023

import { readable } from '@ts-awesome/model-reader'

export class TransferEntryOutput {
  @readable address!: string
  @readable value!: number
  @readable valueString!: string
  @readable(Boolean) isPayGo!: boolean

  @readable(String, true) wallet?: string | null
  @readable(String, true) label?: string | null
}

export class TransferHistoryItem {
  @readable date!: Date
  @readable action!: TransferState
  @readable(String, true) comment?: string | null
}

export class CoinSpecificData {
  @readable gas!: number
  @readable gasPrice!: number
  @readable contractSequenceId!: number
}

export enum OnChainWalletType {
  Hot = 'hot',
}

export enum TransferType {
  Receive = 'receive',
  Send = 'send',
}

export enum TransferState {
  Created = 'created',
  Confirmed = 'confirmed',
  Signed = 'signed',
  Failed = 'failed',
}

export class TransferOutput {
  @readable id!: string
  @readable type!: TransferType
  @readable coin!: string
  @readable wallet!: string
  @readable walletType!: OnChainWalletType
  @readable enterprise!: string
  @readable txid!: string
  @readable height!: number
  @readable heightId!: string
  @readable date!: Date
  @readable confirmations!: number
  @readable value!: number
  @readable valueString!: string
  @readable baseValue!: number
  @readable baseValueString!: string
  @readable feeString!: string
  @readable payGoFee!: number
  @readable payGoFeeString!: string
  @readable usd!: number
  @readable usdRate!: number
  @readable state!: TransferState
  @readable instant!: boolean
  @readable isReward!: boolean
  @readable isFee!: boolean
  @readable([String]) tags!: string[]
  @readable([TransferHistoryItem]) history!: TransferHistoryItem[]
  @readable([TransferEntryOutput]) entries!: TransferEntryOutput[]
  @readable(CoinSpecificData) coinSpecific!: CoinSpecificData

  @readable confirmedTime!: Date
  @readable createdTime!: Date
  @readable(String, true) label?: string | null
}
