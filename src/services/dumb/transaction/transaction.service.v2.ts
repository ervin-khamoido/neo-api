2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  Currency,
  ITransactionEntityService,
  ITransactionStatusEntityService,
  TransactionEntityServiceSymbol,
  TransactionModel,
  TransactionStatus,
  TransactionStatusEntityServiceSymbol,
} from '../../../models/db'

import { ITransactionStatusServiceV2, TransactionStatusServiceV2Symbol } from './transaction-status.service.v2'
import {
  IModernTreasuryService,
  ModernTreasuryServiceSymbol,
  toModernTreasuryAmount,
} from '../../modern-treasury.service'
import { MTLedgerEntryDirectionType, MTTransactionStatus } from '../../../models/modern-treasury'

export type ImmediateTransactionStatus = TransactionStatus.Completed | TransactionStatus.Failed

export interface ITransactionServiceV2 {
  createTransaction(
    orderId: number,
    payload: ICreateTransaction,
    immediateStatus?: ImmediateTransactionStatus,
  ): Promise<TransactionModel>
  completeTransaction(transactionId: number): Promise<void>
  failTransaction(transactionId: number): Promise<void>

  /**
   * Get the transaction's status by internal ID.
   *
   * @param transactionId Transaction's ID in the database.
   * @returns {TransactionStatus} Status of the transaction.
   * @throws {Error} If a transaction by "transactionId" is not found.
   */
  getTransactionStatus(transactionId: number): Promise<TransactionStatus>

  /**
   * Get the transaction by UID.
   *
   * @param uid Transaction's UID in the database.
   * @returns {TransactionModel} Status of the transaction.
   * @throws {Error} If a transaction by "transactionId" is not found.
   */
  getTransaction(uid: string): Promise<TransactionModel>

  /**
   * Get the child transactions by a parent transaction ID.
   *
   * @param id Transaction's ID in the database.
   * @returns {TransactionModel[]} Status of the transaction.
   */
  getChildTransactions(id: number): Promise<TransactionModel[]>

  /**
   * Get the list of transactions by order ID
   *
   * @param orderId Order ID in the database.
   * @returns {[TransactionModel]} Array of transactions
   */
  getTransactionsByOrderId(orderId: number): Promise<TransactionModel[]>
}

export const TransactionServiceV2Symbol = Symbol.for('ITransactionServiceV2')

@injectable()
export class TransactionServiceV2 implements ITransactionServiceV2 {
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService
  @inject(TransactionEntityServiceSymbol) transactionEntityService!: ITransactionEntityService
  @inject(TransactionStatusEntityServiceSymbol) transactionStatusEntityService!: ITransactionStatusEntityService
  @inject(TransactionStatusServiceV2Symbol) transactionStatusService!: ITransactionStatusServiceV2

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(TransactionServiceV2)
  }

  async createTransaction(
    orderId: number,
    payload: ICreateTransaction,
    immediateStatus?: ImmediateTransactionStatus,
  ): Promise<TransactionModel> {
    // Create transaction in the db
    const transaction = await this.transactionEntityService.addOne({
      orderId: orderId,
      createdBy: payload.createdBy,
      from: payload.source,
      fromAmount: payload.amount,
      fromCurrency: payload.currency,
      to: payload.dest,
      toAmount: payload.amount,
      toCurrency: payload.currency,
      parentTransactionId: payload.parentTransactionId,
    })

    await this.transactionStatusService.create(transaction.id)

    // create the transaction in Modern Treasury
    try {
      const effectiveDate = this.modernTreasuryService.getTransactionEffectiveDate(new Date())
      const mtStatus = this.getImmediateMTStatus(immediateStatus)

      const response = await this.modernTreasuryService.createTransaction({
        effective_date: effectiveDate,
        external_id: transaction.uid,
        status: mtStatus,
        description: payload.description,
        ledger_entries: [
          {
            ledger_account_id: transaction.from,
            amount: toModernTreasuryAmount(transaction.fromAmount),
            direction: MTLedgerEntryDirectionType.Debit,
            available_balance_amount: {
              // TODO: if we allow anywhere to go in the red, then move this to a parameter
              gte: payload.allowNegativeBalance ? undefined : 0,
            },

            // fixes https://help.moderntreasury.com/hc/en-us/articles/13209054441229
            // making sure the transaction does not have a delayed lock version assignment
            show_resulting_ledger_account_balances: true,
          },
          {
            ledger_account_id: transaction.to,
            amount: toModernTreasuryAmount(transaction.toAmount),
            direction: MTLedgerEntryDirectionType.Credit,

            // fixes https://help.moderntreasury.com/hc/en-us/articles/13209054441229
            // making sure the transaction does not have a delayed lock version assignment
            show_resulting_ledger_account_balances: true,
          },
        ],
      })

      // update transaction status
      await this.transactionStatusService.pending(transaction.id, response.id, response)

      switch (immediateStatus) {
        case TransactionStatus.Completed:
          await this.transactionStatusService.completed(transaction.id)
          break
        case TransactionStatus.Failed:
          await this.transactionStatusService.failed(transaction.id, response)
          break
      }
    } catch (error: any) {
      this.logger.error(error)
      await this.transactionStatusService.exception(transaction.id, 'modern treasury failed')

      throw error
    }

    return transaction
  }

  async completeTransaction(transactionId: number): Promise<void> {
    const transactionStatus = await this.transactionStatusEntityService.getOne({ transactionId })
    if (!transactionStatus?.modernTreasuryTransactionId) {
      throw new Error(`unexpected: transaction status for id:${transactionId} is not found`)
    }

    try {
      await this.modernTreasuryService.updateTransaction(transactionStatus.modernTreasuryTransactionId, {
        status: MTTransactionStatus.Posted,
      })

      // update transaction status
      await this.transactionStatusService.completed(transactionId)
    } catch (error: any) {
      this.logger.error(error)
      await this.transactionStatusService.exception(transactionId, 'modern treasury failed')

      throw error
    }
  }

  async failTransaction(transactionId: number): Promise<void> {
    const transactionStatus = await this.transactionStatusEntityService.getOne({ transactionId })
    if (!transactionStatus?.modernTreasuryTransactionId) {
      throw new Error(`unexpected: transaction status for id:${transactionId} is not found`)
    }

    try {
      await this.modernTreasuryService.updateTransaction(transactionStatus.modernTreasuryTransactionId, {
        status: MTTransactionStatus.Archived,
      })

      // update transaction status
      await this.transactionStatusService.failed(transactionId, {})
    } catch (error: any) {
      this.logger.error(error)
      await this.transactionStatusService.exception(transactionId, 'modern treasury failed')

      throw error
    }
  }

  async getTransactionStatus(transactionId: number): Promise<TransactionStatus> {
    const transactionStatus = await this.transactionStatusEntityService.getOne({ transactionId })
    if (!transactionStatus) {
      throw new Error(`unexpected: transaction id:${transactionId} is not found`)
    }

    return transactionStatus.status
  }

  async getTransaction(uid: string): Promise<TransactionModel> {
    const transaction = await this.transactionEntityService.getOne({ uid: uid })
    if (!transaction) {
      throw new Error(`unexpected: transaction uid:${uid} is not found`)
    }

    return transaction
  }

  async getTransactionsByOrderId(orderId: number): Promise<TransactionModel[]> {
    const transactions = await this.transactionEntityService.get({ orderId: orderId })

    return [...transactions]
  }

  async getChildTransactions(id: number): Promise<TransactionModel[]> {
    const transactions = await this.transactionEntityService.get({ parentTransactionId: id })

    return [...transactions]
  }

  private getImmediateMTStatus(immediateStatus?: ImmediateTransactionStatus): MTTransactionStatus {
    switch (immediateStatus) {
      case TransactionStatus.Completed:
        return MTTransactionStatus.Posted
      case TransactionStatus.Failed:
        return MTTransactionStatus.Archived
      default:
        return MTTransactionStatus.Pending
    }
  }
}

export interface ICreateTransaction {
  source: string
  dest: string
  currency: Currency
  amount: number
  createdBy: string

  description?: string
  parentTransactionId?: number
  fromBalanceLockVersion?: number
  allowNegativeBalance?: true
}
