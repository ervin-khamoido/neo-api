2021

import { readable } from '@ts-awesome/model-reader'

export enum MTLedgerEntryDirectionType {
  Debit = 'debit',
  Credit = 'credit',
}

export enum MTTransactionStatus {
  Pending = 'pending', // pending
  Posted = 'posted', // posted, pending -> posted
  Archived = 'archived', // pending -> archived
}

export class MTLedgerEntryCreateAmountLock {
  @readable(Number, true) lt?: number | null
  @readable(Number, true) lte?: number | null
  @readable(Number, true) eq?: number | null
  @readable(Number, true) gte?: number | null
  @readable(Number, true) gt?: number | null
}

export class MTLedgerEntryCreate {
  @readable(Number) amount!: number
  @readable(String) direction!: MTLedgerEntryDirectionType
  @readable(String) ledger_account_id!: string
  @readable(Number, true) lock_version?: number | null

  // used as a locking param to ensure the transaction is completed and we don't get any artifact balances
  // can also be used to get the balance as a result of the completed transaction
  @readable(Boolean, true) show_resulting_ledger_account_balances?: boolean | null

  @readable(Object, true) posted_balance_amount?: MTLedgerEntryCreateAmountLock | null
  @readable(Object, true) available_balance_amount?: MTLedgerEntryCreateAmountLock | null

  // TODO: uncomment when we use pending and available balances
  // @readable(Object, true) pending_balance_amount?: MTLedgerEntryCreateAmountLock | null
}

export class TransactionCreateRequest {
  @readable(String) external_id!: string
  @readable(String) effective_date!: string //Format: yyyy-mm-dd
  @readable(String) status!: MTTransactionStatus
  @readable(String, true) description?: string | null
  @readable(Object, true) metadata?: object | null
  @readable(String, true) ledgerable_type?: string | null
  @readable(String, true) ledgerable_id?: string | null

  @readable(Array) ledger_entries!: MTLedgerEntryCreate[]
}
