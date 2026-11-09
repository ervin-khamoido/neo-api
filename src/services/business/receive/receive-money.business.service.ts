2021

import { inject, injectable, named } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IUserEntityService, UserEntityServiceSymbol, UserModel } from '../../../models/db'

import {
  ICursorBasedResult,
  IModernTreasuryService,
  ModernTreasuryServiceSymbol,
  toModernTreasuryAmount,
} from '../../modern-treasury.service'
import { IWalletMetadata, MTLedgerEntryDirectionType, MTTransactionStatus } from '../../../models/modern-treasury'
import { IUserLimitService, UserLimitServiceSymbol } from '../../user-limit.service'
import { UserActionType } from '../../../models/limits'
import { IWalletService, WalletServiceSymbol } from '../../wallet.service'
import { IUserBalanceService, UserBalanceServiceSymbol } from '../../user-balance.service'
import { IMoneyTransferService, MoneyTransferServiceSymbol } from '../../money-transfer.service'
import { EventQueueSymbol } from '../../../utils/event-queue'
import {
  IncomingWalletProcessorEvent,
  IncomingWalletProcessorQueue,
  IncomingWalletRepeatableJobKey,
} from '../../../microservice/incoming-wallet-processor/model/queue.config'
import { Queue } from 'bullmq'
import { MoveMoneyEventData } from '../../../microservice/incoming-wallet-processor/model/move-money-event.data'
import { RepeatableJobPayload } from '../scheduler.business.service'
import { IModernTreasuryConfig, ModernTreasuryConfigSymbol } from '../../../models/config'

export interface IReceiveMoneyBusinessService {
  getUsersWithIncomingWallet(pageSize: number, cursor?: string | null): Promise<ICursorBasedResult<string>>
  transferMaxFromIncomingToSaving(userUid: string): Promise<void>
  notifyReceiveForUser(user: UserModel): Promise<void>
  notifyReceiveForAll(): Promise<void>
}

export const ReceiveMoneyBusinessServiceSymbol = Symbol.for('IReceiveMoneyBusinessService')

@injectable()
export class ReceiveMoneyBusinessService implements IReceiveMoneyBusinessService {
  // BullMQ documentation
  // https://docs.bullmq.io/guide/jobs/repeatable
  public static RepeatableJobConfig: RepeatableJobPayload<{}> = {
    name: IncomingWalletProcessorEvent.MoveMoney,
    data: {},
    deprecatedJobKeys: [],
    options: {
      jobId: IncomingWalletRepeatableJobKey,
      repeatJobKey: IncomingWalletRepeatableJobKey,
      repeat: {
        // At minute 7 past every hour from 2 through 23.
        // https://crontab.guru/#0_2-23_*_*_*
        pattern: '7 2-23 * * *',
      },
    },
  }

  @inject(ModernTreasuryConfigSymbol) modernTreasuryConfig!: IModernTreasuryConfig
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(WalletServiceSymbol) walletService!: IWalletService
  @inject(UserLimitServiceSymbol) userLimitService!: IUserLimitService
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService
  @inject(MoneyTransferServiceSymbol) moneyTransferService!: IMoneyTransferService

  @inject(EventQueueSymbol) @named(IncomingWalletProcessorQueue) queue!: Queue<MoveMoneyEventData>

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(ReceiveMoneyBusinessService)
  }

  async getUsersWithIncomingWallet(pageSize: number, cursor?: string | null): Promise<ICursorBasedResult<string>> {
    const cursorBasedResult = await this.modernTreasuryService.getIncomingAccounts(
      this.modernTreasuryConfig.ledgerId,
      pageSize,
      cursor,
    )

    const users = cursorBasedResult.items
      .map(a => {
        return (<IWalletMetadata>a.metadata)?.owner
      })
      .filter(u => !!u)

    return { ...cursorBasedResult, items: users }
  }

  async transferMaxFromIncomingToSaving(userUid: string): Promise<void> {
    const user = await this.userEntityService.getOne({ uid: userUid })
    if (!user) {
      throw new Error('unexpected: user not found')
    }

    const ledgerIncomingWallet = await this.modernTreasuryService.getIncomingAccount(user.uid)
    if (!ledgerIncomingWallet) {
      this.logger.warn(
        `unexpected: could not find incoming account for user ${user.uid}. terminating incoming account processing`,
      )
      return
    }

    const incomingBalance = this.userBalanceService.getIncomingBalanceFromAccount(ledgerIncomingWallet)
    const incomingLockVersion = ledgerIncomingWallet.lock_version
    if (incomingBalance <= 0) {
      this.logger.info(
        `user ${user.uid} incoming balance is <= 0 (${incomingBalance}). terminating incoming account processing`,
      )
      return
    }

    // get max limit
    const maxLimit = await this.userLimitService.getMaxAvailableActionLimit(user.id, UserActionType.Receive)

    if (maxLimit.maxLimit <= 0) {
      this.logger.info(
        `user ${user.uid} max available limit is <= 0 (${maxLimit.maxLimit}). terminating incoming account processing`,
      )
      return
    }

    // TODO move the decision on where to move money to to MoneyTransferService
    const savingWallet = await this.walletService.getMTSavingWallet(user.id)
    if (!savingWallet) {
      this.logger.warn(
        `unexpected: could not find saving wallet for user ${user.uid}. terminating incoming account processing`,
      )
      return
    }

    const transactionAmount = Math.min(maxLimit.maxLimit, incomingBalance)
    const actionApproval = await this.moneyTransferService.verifyUserCanReceiveAmount(user.id, transactionAmount)

    const effectiveDate = this.modernTreasuryService.getTransactionEffectiveDate(new Date())

    await this.modernTreasuryService.createTransaction({
      effective_date: effectiveDate,
      external_id: `incoming:u:${user.uid}:${incomingLockVersion}`,
      status: MTTransactionStatus.Posted,
      description: `transfer.internal.incoming.saving`,
      ledger_entries: [
        {
          ledger_account_id: ledgerIncomingWallet.id,
          amount: toModernTreasuryAmount(transactionAmount),
          direction: MTLedgerEntryDirectionType.Debit,

          // lock version of the incoming wallet
          // if this value changed then the incoming balance also changed
          // and we cannot guarantee the maximum amount that can be transferred
          // DO NOT USE along with posted_balance_amount since it will override posted_balance_amount behavior
          // TODO: comment when atomic lock is implemented
          lock_version: incomingLockVersion,

          // graceful transfer processing
          // making sure we are not over the amount for any reason
          // TODO: uncomment when atomic lock is implemented
          // posted_balance_amount: {
          //   gte: 0,
          // },

          // fixes https://help.moderntreasury.com/hc/en-us/articles/13209054441229
          // making sure the transaction does not have a delayed lock version assignment
          show_resulting_ledger_account_balances: true,
        },
        {
          ledger_account_id: savingWallet.ledgerAccountId,
          amount: toModernTreasuryAmount(transactionAmount),
          direction: MTLedgerEntryDirectionType.Credit,

          // the lock version of the original saving wallet that had the limits calculated upon
          // if this value changed then the limits has also been changed
          // and we need to start the operation over later
          lock_version: actionApproval.lockVersion,

          // fixes https://help.moderntreasury.com/hc/en-us/articles/13209054441229
          // making sure the transaction does not have a delayed lock version assignment
          show_resulting_ledger_account_balances: true,
        },
      ],
    })

    await this.userBalanceService.notifyUserBalance(user.id)
  }

  async notifyReceiveForUser(user: UserModel): Promise<void> {
    await this.queue.add(IncomingWalletProcessorEvent.MoveMoney, { user: user.uid })
  }

  async notifyReceiveForAll(): Promise<void> {
    await this.queue.add(IncomingWalletProcessorEvent.MoveMoney, {})
  }
}
