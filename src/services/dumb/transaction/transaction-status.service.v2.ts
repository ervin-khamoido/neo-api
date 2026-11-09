2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  ITransactionStatusEntityService,
  TransactionStatus,
  TransactionStatusEntityServiceSymbol,
  TransactionStatusModel,
} from '../../../models/db'

export interface ITransactionStatusServiceV2 {
  create(transactionId: number): Promise<TransactionStatusModel>
  pending(transactionId: number, mtTransactionId: string, payload: object): Promise<TransactionStatusModel>
  failed(transactionId: number, payload: object): Promise<TransactionStatusModel>
  exception(transactionId: number, reason?: string): Promise<TransactionStatusModel>
  completed(transactionId: number): Promise<TransactionStatusModel>
}

export const TransactionStatusServiceV2Symbol = Symbol.for('ITransactionStatusServiceV2')

@injectable()
export class TransactionStatusServiceV2 implements ITransactionStatusServiceV2 {
  @inject(TransactionStatusEntityServiceSymbol) transactionStatusEntityService!: ITransactionStatusEntityService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(TransactionStatusServiceV2)
  }

  async create(transactionId: number): Promise<TransactionStatusModel> {
    return this.transactionStatusEntityService.addOne({
      transactionId: transactionId,
      status: TransactionStatus.Created,
    })
  }

  async pending(transactionId: number, mtTransactionId: string, payload: object): Promise<TransactionStatusModel> {
    // TODO: MUST BE "getForUpdate"
    const currentStatus = await this.transactionStatusEntityService.getOne({ transactionId })
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for transaction ${transactionId}`)
    }

    if (currentStatus.status === TransactionStatus.Pending) {
      this.logger.warn(
        `Cannot move transaction id:${transactionId} to status:${TransactionStatus.Pending}. Already in status`,
      )
      return currentStatus
    }

    const fromStatuses = [TransactionStatus.Created]
    if (!fromStatuses.includes(currentStatus.status)) {
      throw new Error(
        `unexpected: Cannot move transaction id:${currentStatus.transactionId} from status:${currentStatus.status} ` +
          `to status:${TransactionStatus.Pending}. Allowed statuses: ${fromStatuses}`,
      )
    }

    const nextStatus = await this.transactionStatusEntityService.updateOne({
      transactionId: transactionId,
      modernTreasuryTransactionId: mtTransactionId,
      modernTreasuryPayload: payload,
      status: TransactionStatus.Pending,
    })

    return nextStatus!
  }

  async failed(transactionId: number, payload: object): Promise<TransactionStatusModel> {
    // TODO: MUST BE "getForUpdate"
    const currentStatus = await this.transactionStatusEntityService.getOne({ transactionId })
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for transaction ${transactionId}`)
    }

    if (currentStatus.status === TransactionStatus.Failed) {
      this.logger.warn(
        `Cannot move transaction id:${transactionId} to status:${TransactionStatus.Failed}. Already in status`,
      )
      return currentStatus
    }

    const fromStatuses = [TransactionStatus.Pending]
    if (!fromStatuses.includes(currentStatus.status)) {
      throw new Error(
        `unexpected: Cannot move transaction id:${transactionId} from status:${currentStatus.status} ` +
          `to status:${TransactionStatus.Failed}. Allowed statuses: ${fromStatuses}`,
      )
    }

    const nextStatus = await this.transactionStatusEntityService.updateOne({
      transactionId: transactionId,
      status: TransactionStatus.Failed,
    })

    return nextStatus!
  }

  async completed(transactionId: number): Promise<TransactionStatusModel> {
    // TODO: MUST BE "getForUpdate"
    const currentStatus = await this.transactionStatusEntityService.getOne({ transactionId })
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for transaction ${transactionId}`)
    }

    if (currentStatus.status === TransactionStatus.Completed) {
      this.logger.warn(
        `Cannot move transaction id:${transactionId} to status:${TransactionStatus.Completed}. Already in status`,
      )
      return currentStatus
    }

    const fromStatuses = [TransactionStatus.Pending]
    if (!fromStatuses.includes(currentStatus.status)) {
      throw new Error(
        `unexpected: Cannot move transaction id:${transactionId} from status:${currentStatus.status} ` +
          `to status:${TransactionStatus.Completed}. Allowed statuses: ${fromStatuses}`,
      )
    }

    const nextStatus = await this.transactionStatusEntityService.updateOne({
      transactionId: transactionId,
      status: TransactionStatus.Completed,
    })

    return nextStatus!
  }

  async exception(transactionId: number, reason?: string): Promise<TransactionStatusModel> {
    // TODO: MUST BE "getForUpdate"
    const currentStatus = await this.transactionStatusEntityService.getOne({ transactionId })
    if (!currentStatus) {
      throw new Error(`precondition failed: status undefined for transaction ${transactionId}`)
    }

    if (currentStatus.status === TransactionStatus.Exception) {
      this.logger.warn(
        `Cannot move transaction id:${transactionId} to status:${TransactionStatus.Exception}. Already in status`,
      )
      return currentStatus
    }

    const fromStatuses = [TransactionStatus.Created]
    if (!fromStatuses.includes(currentStatus.status)) {
      throw new Error(
        `unexpected: Cannot move transaction id:${transactionId} from status:${currentStatus.status} ` +
          `to status:${TransactionStatus.Exception}. Allowed statuses: ${fromStatuses}`,
      )
    }

    const nextStatus = await this.transactionStatusEntityService.updateOne({
      transactionId: transactionId,
      status: TransactionStatus.Exception,
      statusReason: reason,
    })

    return nextStatus!
  }
}
