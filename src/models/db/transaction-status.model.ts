2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_JSON } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum TransactionStatus {
  Created = 'created',
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
  Exception = 'exception', // WHEN THERE WAS AN EXCEPTION CALLING MT SERVICE
}

@dbTable('transaction_status')
export class TransactionStatusModel {
  @dbField({ name: 'transaction_id', primaryKey: true })
  transactionId!: number

  @dbField
  status!: TransactionStatus

  @dbField({ name: 'status_reason', model: String, nullable: true })
  statusReason!: string | null

  @dbField({ name: 'modern_treasury_transaction_id', model: String, nullable: true })
  modernTreasuryTransactionId!: string | null

  @dbField({ name: 'modern_treasury_status', model: String, nullable: true })
  modernTreasuryStatus!: string | null

  @dbField({ name: 'modern_treasury_payload', kind: DB_JSON, model: Object, nullable: true })
  modernTreasuryPayload!: object | null

  @dbField({ name: 'total_fees', model: Number, nullable: true })
  totalFees!: number | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const TransactionStatusEntityServiceSymbol = Symbols.serviceFor(TransactionStatusModel)

export interface ITransactionStatusEntityService
  extends IEntityService<
    TransactionStatusModel,
    'transactionId',
    'updatedAt' | 'createdAt',
    'statusReason' | 'modernTreasuryTransactionId' | 'modernTreasuryStatus' | 'modernTreasuryPayload' | 'totalFees'
  > {}
