2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  TransactionStatusModel,
  TransactionStatus,
  TransactionStatusEntityServiceSymbol,
  ITransactionStatusEntityService,
} from '../../models/db'
import { IAddTransactionStatusInput, ITransactionStatusChangeResult } from '../../models/transaction'
import { TransactionResponse } from '../../models/modern-treasury'
import e from 'express'

export interface ITransactionStatusService {
  getTransactionStatus(transactionId: number): Promise<TransactionStatusModel>
  addTransactionStatus(
    transactionId: number,
    transactionStatusInput: IAddTransactionStatusInput,
  ): Promise<TransactionStatusModel>
  create(transactionId: number): Promise<TransactionStatusModel>
  pending(
    transactionId: number,
    modernTreasuryTransaction: TransactionResponse,
  ): Promise<ITransactionStatusChangeResult>
  restorePending(
    transactionId: number,
    modernTreasuryTransaction: TransactionResponse,
  ): Promise<ITransactionStatusChangeResult>
  exception(transactionId: number, reason?: string): Promise<ITransactionStatusChangeResult>
  completed(transactionId: number): Promise<ITransactionStatusChangeResult>
}

export const TransactionStatusServiceSymbol = Symbol.for('ITransactionStatusService')

@injectable()
export class TransactionStatusService implements ITransactionStatusService {
  @inject(TransactionStatusEntityServiceSymbol)
  transactionStatusEntityService!: ITransactionStatusEntityService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(TransactionStatusService)
  }

  async getTransactionStatus(transactionId: number): Promise<TransactionStatusModel> {
    const status = await this.transactionStatusEntityService.getOne({ transactionId: transactionId })
    return status!
  }

  async create(transactionId: number): Promise<TransactionStatusModel> {
    return await this.transactionStatusEntityService.addOne({
      transactionId: transactionId,
      status: TransactionStatus.Created,
    })
  }

  async pending(
    transactionId: number,
    modernTreasuryTransaction: TransactionResponse,
  ): Promise<ITransactionStatusChangeResult> {
    let status = await this.getTransactionStatus(transactionId)
    const finalStatus = TransactionStatus.Pending

    if (status.status === finalStatus) {
      this.logger.warn(`Cannot move transaction id:${status.transactionId} to status:${finalStatus}. Already in status`)
      return { transactionStatus: status, changed: false }
    }

    const fromStatuses = [TransactionStatus.Created]
    if (!fromStatuses.includes(status.status)) {
      throw new Error(
        `unexpected: Cannot move transaction id:${status.transactionId} from status:${status.status} to status:${finalStatus}. Allowed statuses: ${fromStatuses}`,
      )
    }

    status = (await this.transactionStatusEntityService.updateOne({
      transactionId: transactionId,
      modernTreasuryStatus: modernTreasuryTransaction.status,
      modernTreasuryTransactionId: modernTreasuryTransaction.id,
      modernTreasuryPayload: modernTreasuryTransaction,
      status: finalStatus,
      totalFees: 0,
    }))!

    return { transactionStatus: status, changed: true }
  }

  async restorePending(
    transactionId: number,
    modernTreasuryTransaction: TransactionResponse,
  ): Promise<ITransactionStatusChangeResult> {
    this.logger.warn(`restoring pending transaction ${modernTreasuryTransaction.external_id}}`)

    let status = await this.getTransactionStatus(transactionId)
    const finalStatus = TransactionStatus.Pending

    if (status.status === finalStatus) {
      this.logger.warn(`Cannot move transaction id:${status.transactionId} to status:${finalStatus}. Already in status`)
      return { transactionStatus: status, changed: false }
    }

    const fromStatuses = [TransactionStatus.Exception]
    if (!fromStatuses.includes(status.status)) {
      throw new Error(
        `unexpected: Cannot move transaction id:${status.transactionId} from status:${status.status} to status:${finalStatus}. Allowed statuses: ${fromStatuses}`,
      )
    }

    if (!!status.modernTreasuryTransactionId) {
      this.logger.warn(`modernTreasuryTransactionId already set, updating only transaction status`)

      status = (await this.transactionStatusEntityService.updateOne({
        transactionId: transactionId,
        status: finalStatus,
      }))!
    } else {
      status = (await this.transactionStatusEntityService.updateOne({
        transactionId: transactionId,
        modernTreasuryStatus: modernTreasuryTransaction.status,
        modernTreasuryTransactionId: modernTreasuryTransaction.id,
        modernTreasuryPayload: modernTreasuryTransaction,
        status: finalStatus,
        totalFees: 0,
      }))!
    }

    return { transactionStatus: status, changed: true }
  }

  async completed(transactionId: number): Promise<ITransactionStatusChangeResult> {
    let status = await this.getTransactionStatus(transactionId)
    const finalStatus = TransactionStatus.Completed

    if (status.status === finalStatus) {
      this.logger.warn(`Cannot move transaction id:${status.transactionId} to status:${finalStatus}. Already in status`)
      return { transactionStatus: status, changed: false }
    }

    const fromStatuses = [TransactionStatus.Pending]
    if (!fromStatuses.includes(status.status)) {
      throw new Error(
        `unexpected: Cannot move transaction id:${status.transactionId} from status:${status.status} to status:${finalStatus}. Allowed statuses: ${fromStatuses}`,
      )
    }

    status = (await this.transactionStatusEntityService.updateOne({
      transactionId: transactionId,
      status: finalStatus,
    }))!

    return { transactionStatus: status, changed: true }
  }

  async exception(transactionId: number, reason?: string): Promise<ITransactionStatusChangeResult> {
    let status = await this.getTransactionStatus(transactionId)
    const finalStatus = TransactionStatus.Exception

    if (status.status === finalStatus) {
      this.logger.warn(`Cannot move transaction id:${status.transactionId} to status:${finalStatus}. Already in status`)
      return { transactionStatus: status, changed: false }
    }

    const fromStatuses = [TransactionStatus.Created]
    if (!fromStatuses.includes(status.status)) {
      throw new Error(
        `unexpected: Cannot move transaction id:${status.transactionId} from status:${status.status} to status:${finalStatus}. Allowed statuses: ${fromStatuses}`,
      )
    }

    status = (await this.transactionStatusEntityService.updateOne({
      transactionId: transactionId,
      status: finalStatus,
      statusReason: reason,
    }))!

    return { transactionStatus: status, changed: true }
  }

  async addTransactionStatus(
    transactionId: number,
    transactionStatusInput: IAddTransactionStatusInput,
  ): Promise<TransactionStatusModel> {
    const existingTransactionStatus = await this.getTransactionStatus(transactionId)
    if (existingTransactionStatus) {
      throw new Error(`unexpected: transaction status for transactionId:${transactionId} already exists`)
    }

    return await this.transactionStatusEntityService.addOne({
      transactionId: transactionId,
      status: transactionStatusInput.status,
      statusReason: transactionStatusInput.statusReason,
      modernTreasuryTransactionId: transactionStatusInput.modernTreasuryTransactionId,
      modernTreasuryStatus: transactionStatusInput.modernTreasuryStatus,
      modernTreasuryPayload: transactionStatusInput.modernTreasuryPayload,
      totalFees: transactionStatusInput.totalFees,
    })
  }
}
