2021

import { readable } from '@ts-awesome/model-reader'

import { Currency, MTNormalBalanceType } from '../db'

class Balance {
  @readable(Number) amount!: number
  @readable(Number, true) credits?: number | null
  @readable(Number, true) debits?: number | null
  @readable(String) currency!: Currency
}

class Balances {
  @readable(Balance) pending_balance!: Balance
  @readable(Balance) posted_balance!: Balance
  @readable(Balance) available_balance!: Balance
}

export class AccountResponse {
  @readable(String) id!: string
  @readable(String) name!: string
  @readable(String) ledger_id!: string
  @readable(Number) lock_version!: number
  @readable(String) normal_balance!: MTNormalBalanceType

  @readable(Balances) balances!: Balances

  @readable(Boolean, true) is_live?: boolean | null
  @readable(String, true) description?: string | null
  @readable(String, true) object?: string | null
  @readable(Object, true) metadata?: object | null

  // ---
  @readable(String) created_at!: Date
  @readable(String) updated_at!: Date
}
