2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum Currency {
  USDC = 'USDC',
}

@dbTable('transaction')
export class TransactionModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ name: 'parent_transaction_id', model: Number, nullable: true })
  parentTransactionId!: number | null

  @dbField({ name: 'order_id' })
  orderId!: number

  @dbField({ name: 'from' })
  from!: string

  @dbField({ name: 'from_currency' })
  fromCurrency!: Currency

  @dbField({ name: 'from_amount' })
  fromAmount!: number

  @dbField({ name: 'to' })
  to!: string

  @dbField({ name: 'to_currency' })
  toCurrency!: Currency

  @dbField({ name: 'to_amount' })
  toAmount!: number

  @dbField({ name: 'created_by' })
  createdBy!: string

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const TransactionEntityServiceSymbol = Symbols.serviceFor(TransactionModel)

export interface ITransactionEntityService
  extends IEntityService<TransactionModel, 'id', 'id' | 'uid' | 'updatedAt' | 'createdAt', 'parentTransactionId'> {}
