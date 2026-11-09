2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IConfig, ConfigSymbol } from '@ts-awesome/config'
import { desc, not, of } from '@ts-awesome/orm'
import { isNil } from 'lodash'
import {
  TransactionStatusModel,
  TransactionModel,
  TransactionEntityServiceSymbol,
  ITransactionEntityService,
  TransactionStatus,
} from '../../models/db'

import { TransactionStatusServiceSymbol, ITransactionStatusService } from './transaction-status.service'
import { IModernTreasuryService, ModernTreasuryServiceSymbol, toModernTreasuryAmount } from '../modern-treasury.service'
import {
  IAddTransactionInput,
  IAddTransactionStatusInput,
  ICreateTransactionInput,
  ITransactionStatusChangeResult,
} from '../../models/transaction'
import { MTLedgerEntryDirectionType, MTTransactionStatus, TransactionResponse } from '../../models/modern-treasury'

export interface ITransactionService {
  getTransaction(id: number): Promise<[TransactionModel | null, TransactionStatusModel | null]>
  getTransactionByUID(uid: string): Promise<[TransactionModel | null, TransactionStatusModel | null]>
  getLatestTransactionByOrderId(orderId: number): Promise<[TransactionModel | null, TransactionStatusModel | null]>
  hasNonFailedTransactions(orderId: number): Promise<boolean>

  createTransaction(
    payload: ICreateTransactionInput,
    isPendingTransaction?: boolean,
  ): Promise<[TransactionModel, ITransactionStatusChangeResult]>
  addTransaction(
    transactionInput: IAddTransactionInput,
    transactionStatusInput: IAddTransactionStatusInput,
  ): Promise<[TransactionModel, TransactionStatusModel]>
  restorePending(id: number, modernTreasuryTransaction: TransactionResponse): Promise<ITransactionStatusChangeResult>
  complete(id: number): Promise<ITransactionStatusChangeResult>
}

export const TransactionServiceSymbol = Symbol.for('ITransactionService')

@injectable()
export class TransactionService implements ITransactionService {
  @inject(ConfigSymbol)
  config!: IConfig

  @inject(ModernTreasuryServiceSymbol)
  modernTreasuryService!: IModernTreasuryService

  @inject(TransactionEntityServiceSymbol)
  transactionEntityService!: ITransactionEntityService

  @inject(TransactionStatusServiceSymbol)
  transactionStatusService!: ITransactionStatusService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(TransactionService)
  }

  async createTransaction(
    payload: ICreateTransactionInput,
    isPendingTransaction?: boolean,
  ): Promise<[TransactionModel, ITransactionStatusChangeResult]> {
    // Create transaction in the db
    const transaction = await this.transactionEntityService.addOne({
      orderId: payload.orderId,
      createdBy: payload.createdBy,
      from: payload.source,
      fromAmount: payload.amount,
      fromCurrency: payload.currency,
      to: payload.dest,
      toAmount: payload.amount,
      toCurrency: payload.currency,
      parentTransactionId: payload.parentTransactionId,
    })

    const transactionStatus = await this.transactionStatusService.create(transaction.id)
    let transactionStatusChangeResult: ITransactionStatusChangeResult = {
      transactionStatus: transactionStatus,
      changed: false,
    }

    // create transfer in ModernTreasury
    try {
      let mtStatus = MTTransactionStatus.Posted
      if (!isNil(isPendingTransaction) && isPendingTransaction) {
        mtStatus = MTTransactionStatus.Pending
      }

      const effectiveDate = this.modernTreasuryService.getTransactionEffectiveDate(new Date())
      const modernTreasuryResponse = await this.modernTreasuryService.createTransaction({
        effective_date: effectiveDate,
        external_id: transaction.uid,
        status: mtStatus,
        description: payload.description,
        ledger_entries: [
          {
            ledger_account_id: transaction.from,
            amount: toModernTreasuryAmount(transaction.fromAmount),
            direction: MTLedgerEntryDirectionType.Debit,
            lock_version: payload.lockVersion,

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
      transactionStatusChangeResult = await this.transactionStatusService.pending(
        transaction.id,
        modernTreasuryResponse,
      )
    } catch (error: any) {
      this.logger.error(error)

      transactionStatusChangeResult = await this.transactionStatusService.exception(
        transaction.id,
        'moderntreasury failed',
      )
    }

    return [transaction, transactionStatusChangeResult]
  }

  async addTransaction(
    transactionInput: IAddTransactionInput,
    transactionStatusInput: IAddTransactionStatusInput,
  ): Promise<[TransactionModel, TransactionStatusModel]> {
    // Add the transaction in the db
    const transaction = await this.transactionEntityService.addOne({
      orderId: transactionInput.orderId,
      createdBy: transactionInput.createdBy,
      from: transactionInput.source,
      fromAmount: transactionInput.amount,
      fromCurrency: transactionInput.currency,
      to: transactionInput.dest,
      toAmount: transactionInput.amount,
      toCurrency: transactionInput.currency,
      parentTransactionId: null,
    })

    const transactionStatus = await this.transactionStatusService.addTransactionStatus(
      transaction.id,
      transactionStatusInput,
    )

    return [transaction, transactionStatus]
  }

  async getTransaction(id: number): Promise<[TransactionModel | null, TransactionStatusModel | null]> {
    return await Promise.all([
      this.transactionEntityService.getOne({ id: id }),
      this.transactionStatusService.getTransactionStatus(id),
    ])
  }

  async getTransactionByUID(uid: string): Promise<[TransactionModel | null, TransactionStatusModel | null]> {
    const transaction = await this.transactionEntityService.getOne({ uid: uid })
    if (!transaction) {
      return [null, null]
    }

    const transactionStatus = await this.transactionStatusService.getTransactionStatus(transaction.id)

    return [transaction, transactionStatus]
  }

  async getLatestTransactionByOrderId(
    orderId: number,
  ): Promise<[TransactionModel | null, TransactionStatusModel | null]> {
    const transaction = await this.transactionEntityService
      .select()
      .where(x => x.orderId.eq(orderId))
      .orderBy(x => [desc(x.createdAt)])
      .fetchOne(TransactionModel)

    if (!transaction) {
      return [null, null]
    }

    const transactionStatus = await this.transactionStatusService.getTransactionStatus(transaction.id)

    return [transaction, transactionStatus]
  }

  async hasNonFailedTransactions(orderId: number): Promise<boolean> {
    const successfulTransactionsExists = await this.transactionEntityService
      .select()
      .join(TransactionStatusModel, (root, other) => root.id.eq(other.transactionId))
      .where(x => x.orderId.eq(orderId))
      .where(x => not(of(TransactionStatusModel, 'status').in([TransactionStatus.Failed, TransactionStatus.Exception])))
      .exists()

    return successfulTransactionsExists
  }

  async complete(id: number): Promise<ITransactionStatusChangeResult> {
    const [, transactionStatus] = await this.getTransaction(id)

    if (!transactionStatus) {
      throw new Error('precondition failed: transaction not found')
    }

    return await this.transactionStatusService.completed(transactionStatus.transactionId)
  }

  async restorePending(
    id: number,
    modernTreasuryTransaction: TransactionResponse,
  ): Promise<ITransactionStatusChangeResult> {
    const [, transactionStatus] = await this.getTransaction(id)

    if (!transactionStatus) {
      throw new Error('precondition failed: transaction not found')
    }

    return await this.transactionStatusService.restorePending(
      transactionStatus.transactionId,
      modernTreasuryTransaction,
    )
  }
}
