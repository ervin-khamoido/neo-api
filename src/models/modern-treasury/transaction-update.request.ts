2021

import { MTTransactionStatus } from './transaction-create.request'

export interface ITransactionUpdateRequest {
  // Currently we do not allow updating ledger entries
  // ledger_entries?: MTLedgerEntryCreate[]

  description?: string | null
  status?: MTTransactionStatus
  metadata?: Record<string, string | boolean | number>

  // https://docs.moderntreasury.com/reference/update-ledger-transaction
}
