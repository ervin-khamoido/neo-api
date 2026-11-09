2021

import { readable } from '@ts-awesome/model-reader'
import { MTTransactionStatus, MTLedgerEntryCreate } from './transaction-create.request'

export class MTLedgerEntry extends MTLedgerEntryCreate {
  @readable(String) id!: string
  @readable(String, true) object?: string | null
  @readable(String) ledger_account_id!: string
  @readable(String) ledger_transaction_id!: string
  @readable(Boolean, true) live_mode?: boolean | null

  // ---
  @readable(String) created_at!: Date
  @readable(String) updated_at!: Date
}

export class TransactionResponse {
  @readable(String) id!: string
  @readable(String) external_id!: string
  @readable(String) ledger_id!: string
  @readable(String) status!: MTTransactionStatus
  @readable(String) effective_date!: string

  @readable(String, true) posted_at?: string | null
  @readable(String, true) description?: string | null
  @readable(String, true) ledgerable_id?: string | null
  @readable(String, true) ledgerable_type?: string | null
  @readable(Boolean, true) live_mode?: boolean | null
  @readable(Object, true) metadata?: object | null
  @readable(String, true) object?: string | null

  @readable(Array) ledger_entries!: MTLedgerEntry[]

  // ---
  @readable(String) created_at!: Date
  @readable(String) updated_at!: Date
}
