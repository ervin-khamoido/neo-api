2021

import { readable } from '@ts-awesome/model-reader'

import { MTNormalBalanceType } from '../db'

// ADD BUT DO NOT CHANGE
export enum WalletCategoryType {
  User = 'user',
  LP = 'lp',
  System = 'system',
}

// ADD BUT DO NOT CHANGE
export enum WalletType {
  // system accounts
  System = 'system', // main system account
  CardNetwork = 'card-network', // system wallet to "destroy" money within the ledger
  SystemCryptoNetwork = 'system-crypto-network', // system wallet to "destroy" money within the ledger

  // user related accounts
  // saving/main/primary
  Saving = 'saving',
  DeletedSaving = 'saving:deleted',
  BlockedSaving = 'saving:blocked',
  // yield
  Yield = 'yield-accumulator',
  DeletedYield = 'yield-accumulator:deleted',
  BlockedYield = 'yield-accumulator:blocked',
  // incoming (receive)
  Incoming = 'incoming',
  DeletedIncoming = 'incoming:deleted',
  // user card accounts
  Card = 'card', // user's card wallet
  DeletedCard = 'card:deleted', // user's deleted card wallet
  BlockedCard = 'card:blocked', // user's blocked card wallet

  // LP related accounts
  Regular = 'regular',
}

// DO NOT CHANGE
export interface IWalletMetadata {
  category: WalletCategoryType
  type: WalletType
  owner: string
  wallet?: string | null
  card?: string | null
}

export class AccountCreateRequest {
  @readable(String) ledger_id!: string
  @readable(String) name!: string
  @readable(String) normal_balance!: MTNormalBalanceType
  @readable(Object) metadata!: IWalletMetadata
  @readable(String, true) description?: string | null
}
