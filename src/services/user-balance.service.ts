2021

import { inject, injectable } from 'inversify'
import { firestore } from 'firebase-admin'

import {
  UserEntityServiceSymbol,
  IUserEntityService,
  ModernTreasuryWalletEntityServiceSymbol,
  IModernTreasuryWalletEntityService,
} from '../models/db'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import {
  fromModernTreasuryAmount,
  IModernTreasuryService,
  ModernTreasuryServiceSymbol,
} from './modern-treasury.service'
import { WalletBalanceResult } from '../models/wallet'
import { YieldBalanceOutput } from '../models/response'
import { IWalletService, WalletServiceSymbol } from './wallet.service'
import { AccountResponse } from '../models/modern-treasury'

export interface IUserBalanceService {
  getUserBalance(userId: number): Promise<WalletBalanceResult>
  notifyUserBalance(userId: number): Promise<void>

  getUserYieldBalance(user: string): Promise<YieldBalanceOutput>
  getUserIncomingBalance(user: string): Promise<WalletBalanceResult>

  getIncomingBalanceFromAccount(account: AccountResponse): number
  getSavingBalanceFromAccount(account: AccountResponse): number
  getYieldBalanceFromAccount(account: AccountResponse): number

  /**
   * Fetches a balance of the user's card wallet from Modern Treasury.
   * The balance returned is an available balance in MT.
   *
   * @param userId User ID in our DB.
   * @param walletId Wallet ID in our DB.
   * @throws {Error} If request to MT is failed.
   */
  getUserCardBalance(userId: number, walletId: string): Promise<number>

  /**
   * Bumps the card balance version in Firestore. The method does not
   * throw if the Firebase request is failed.
   *
   * @param userId User ID in our DB.
   */
  notifyUserCardBalance(userId: number): Promise<void>
}

export const UserBalanceServiceSymbol = Symbol.for('IUserBalanceService')

@injectable()
export class UserBalanceService implements IUserBalanceService {
  @inject(ModernTreasuryWalletEntityServiceSymbol) mtWalletEntityService!: IModernTreasuryWalletEntityService
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(WalletServiceSymbol) walletService!: IWalletService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserBalanceService)
  }

  getSavingBalanceFromAccount(account: AccountResponse): number {
    return this.getAvailableBalance(account)
  }

  getYieldBalanceFromAccount(account: AccountResponse): number {
    return this.getPostedBalance(account)
  }

  getIncomingBalanceFromAccount(account: AccountResponse): number {
    return this.getPostedBalance(account)
  }

  async getUserBalance(userId: number): Promise<WalletBalanceResult> {
    const wallet = await this.walletService.getMTSavingWallet(userId)

    if (!wallet) {
      throw new Error('unexpected: user does not have a wallet')
    }

    const walletResponse = await this.modernTreasuryService.getAccount(wallet.ledgerAccountId)
    if (!walletResponse) {
      throw new Error('unexpected: user does not have an external wallet')
    }

    const balance = this.getSavingBalanceFromAccount(walletResponse)

    return {
      balance: balance,
      currency: 'USD',
      lockVersion: walletResponse.lock_version,
    }
  }

  async notifyUserBalance(userId: number): Promise<void> {
    try {
      const user = await this.userEntityService.getOne({ id: userId })
      if (!user) {
        this.logger.error(`unexpected: user is not found id:${userId}`)
        return
      }

      const increment = firestore.FieldValue.increment(1)
      await firestore()
        .doc(`user/${user.fireUserId}`)
        .set(
          {
            balance: {
              //TODO: legacy implementation, remove once app version 3.5.0+ is live
              updatedAt: new Date().toISOString(),
              // new implementation
              version: increment,
            },
          },
          { merge: true },
        )
    } catch (err) {
      if (typeof err === 'string' || err instanceof Error) {
        this.logger.error(err)
      } else {
        this.logger.error(`Error: ${err}`)
      }
    }
  }

  async getUserYieldBalance(user: string): Promise<YieldBalanceOutput> {
    // Due Date = First day of the next month
    const currentDate = new Date()
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)

    const yieldAccount = await this.modernTreasuryService.getYieldAccount(user)
    if (!yieldAccount) {
      this.logger.error('unexpected: user does not have an external yield wallet')

      return {
        balance: 0,
        currency: 'USD',
        dueDate: dueDate,
      }
    }

    const balance = this.getYieldBalanceFromAccount(yieldAccount)

    return {
      balance: balance,
      currency: 'USD',
      dueDate: dueDate,
    }
  }

  async getUserIncomingBalance(user: string): Promise<WalletBalanceResult> {
    const incomingAccount = await this.modernTreasuryService.getIncomingAccount(user)
    if (!incomingAccount) {
      this.logger.info('user does not have an external incoming wallet. defaulting to 0')

      return {
        balance: 0,
        currency: 'USD',
        lockVersion: 0,
      }
    }

    const balance = this.getIncomingBalanceFromAccount(incomingAccount)

    return {
      balance: balance,
      currency: 'USD',
      lockVersion: incomingAccount.lock_version,
    }
  }

  async getUserCardBalance(userId: number, walletId: string): Promise<number> {
    const wallet = await this.mtWalletEntityService.getOne({ walletId })

    if (!wallet) {
      return 0
    }

    const account = await this.modernTreasuryService.getAccount(wallet.ledgerAccountId)
    if (!account) {
      throw new Error('unexpected: user does not have an external wallet')
    }

    return this.getAvailableBalance(account)
  }

  async notifyUserCardBalance(userId: number): Promise<void> {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      this.logger.error(`unexpected: user is not found id:${userId}`)
      return
    }

    try {
      const increment = firestore.FieldValue.increment(1)
      await firestore()
        .collection('user')
        .doc(user.fireUserId)
        .set({ cardBalance: { version: increment } }, { merge: true })
    } catch (err: any) {
      this.logger.error(err)
    }
  }

  private getPostedBalance(account: AccountResponse): number {
    const rawBalance = account.balances?.posted_balance?.amount ?? 0
    return fromModernTreasuryAmount(rawBalance)
  }

  private getAvailableBalance(account: AccountResponse): number {
    const rawBalance = account.balances?.available_balance?.amount ?? 0
    return fromModernTreasuryAmount(rawBalance)
  }
}
