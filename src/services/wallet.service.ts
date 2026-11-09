2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { of } from '@ts-awesome/orm'

import {
  IModernTreasuryWalletEntityService,
  IUserEntityService,
  IUserWalletEntityService,
  IWalletEntityService,
  ModernTreasuryWalletEntityServiceSymbol,
  ModernTreasuryWalletModel,
  MTNormalBalanceType,
  UserEntityServiceSymbol,
  UserModel,
  UserWalletEntityServiceSymbol,
  UserWalletModel,
  WalletEntityServiceSymbol,
  WalletModel,
} from '../models/db'

import { IModernTreasuryService, ModernTreasuryServiceSymbol } from './modern-treasury.service'
import { IModernTreasuryConfig, ModernTreasuryConfigSymbol } from '../models/config'
import { WalletCategoryType, WalletType } from '../models/modern-treasury'

export interface IWalletService {
  createSavingWallet(user: UserModel): Promise<ModernTreasuryWalletModel>
  createYieldWallet(user: UserModel): Promise<void>
  createIncomingWallet(user: UserModel): Promise<string>
  ensureIncomingWallet(user: UserModel): Promise<string>

  /**
   * Creates the card wallet for a user in DB and Modern Treasury to track
   * cards' transactions in the Ledger.
   *
   * @param userId the owner of the account
   * @returns {string} wallet ID in the DB
   */
  createCardWallet(userId: number): Promise<string>

  getMTSavingWallet(userId: number): Promise<ModernTreasuryWalletModel | null>

  delete(user: UserModel): Promise<void>
  block(user: UserModel): Promise<void>
  unblock(user: UserModel): Promise<void>
}

export const WalletServiceSymbol = Symbol.for('IWalletService')

@injectable()
export class WalletService implements IWalletService {
  @inject(ModernTreasuryConfigSymbol) modernTreasuryConfig!: IModernTreasuryConfig
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(WalletEntityServiceSymbol) walletEntityService!: IWalletEntityService
  @inject(UserWalletEntityServiceSymbol) userWalletEntityService!: IUserWalletEntityService
  @inject(ModernTreasuryWalletEntityServiceSymbol)
  modernTreasuryWalletEntityService!: IModernTreasuryWalletEntityService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(WalletService)
  }

  async createSavingWallet(user: UserModel): Promise<ModernTreasuryWalletModel> {
    const wallet = await this.walletEntityService.addOne({ type: WalletType.Saving })
    await this.userWalletEntityService.addOne({
      userId: user.id,
      walletId: wallet.id,
    })
    const walletName = `u:${user.uid}:${wallet.uid}`

    const account = await this.modernTreasuryService.createAccount({
      name: walletName,
      ledger_id: this.modernTreasuryConfig.ledgerId,
      normal_balance: MTNormalBalanceType.Credit,
      metadata: {
        category: WalletCategoryType.User,
        type: WalletType.Saving,
        owner: user.uid,
        wallet: wallet.uid,
      },
    })

    const modernTreasuryWallet = await this.modernTreasuryWalletEntityService.addOne({
      walletId: wallet.id,

      name: account.name,
      ledgerAccountId: account.id,
      ledgerId: account.ledger_id,
      normalBalance: account.normal_balance,
      object: account.object ?? '',
      callbackUrl: null,
      description: null,
    })

    return modernTreasuryWallet
  }

  async createYieldWallet(user: UserModel): Promise<void> {
    // This logic is duplicated from the yield-processor
    // DO NOT CHANGE unless changed in both places
    const owner = user.uid
    const walletName = `yield-${owner}`
    await this.modernTreasuryService.createAccount({
      name: walletName,
      ledger_id: this.modernTreasuryConfig.ledgerId,
      normal_balance: MTNormalBalanceType.Credit,
      metadata: {
        category: WalletCategoryType.User,
        type: WalletType.Yield,
        owner: owner,
      },
    })
  }

  async createIncomingWallet(user: UserModel): Promise<string> {
    const owner = user.uid
    const walletName = `u:incoming:${owner}`
    const account = await this.modernTreasuryService.createAccount({
      name: walletName,
      ledger_id: this.modernTreasuryConfig.ledgerId,
      normal_balance: MTNormalBalanceType.Credit,
      metadata: {
        category: WalletCategoryType.User,
        type: WalletType.Incoming,
        owner: owner,
      },
    })

    return account.id
  }

  async createCardWallet(userId: number): Promise<string> {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      throw new Error('unexpected: user is not found')
    }

    const wallet = await this.walletEntityService.addOne({ type: WalletType.Card })
    await this.userWalletEntityService.addOne({
      userId: user.id,
      walletId: wallet.id,
    })
    const walletName = `u:${user.uid}:${wallet.uid}`

    const account = await this.modernTreasuryService.createAccount({
      name: walletName,
      ledger_id: this.modernTreasuryConfig.ledgerId,
      normal_balance: MTNormalBalanceType.Credit,
      metadata: {
        category: WalletCategoryType.User,
        type: WalletType.Card,
        owner: user.uid,
        wallet: wallet.uid,
      },
    })

    await this.modernTreasuryWalletEntityService.addOne({
      walletId: wallet.id,

      name: account.name,
      ledgerAccountId: account.id,
      ledgerId: account.ledger_id,
      normalBalance: account.normal_balance,
      object: account.object ?? '',
      callbackUrl: null,
      description: null,
    })

    return wallet.id
  }

  async ensureIncomingWallet(user: UserModel): Promise<string> {
    const incomingWallet = await this.modernTreasuryService.getIncomingAccount(user.uid)
    if (incomingWallet) {
      return incomingWallet.id
    }

    return this.createIncomingWallet(user)
  }

  async getMTSavingWallet(userId: number): Promise<ModernTreasuryWalletModel | null> {
    return await this.modernTreasuryWalletEntityService
      .select()
      .join(UserWalletModel, (root, other) => root.walletId.eq(other.walletId))
      .join(WalletModel, (root, other) => root.walletId.eq(other.id))
      .where(x => of(UserWalletModel, 'userId').eq(userId))
      .where(x => of(WalletModel, 'type').eq(WalletType.Saving))
      .fetchOne(ModernTreasuryWalletModel)
  }

  async delete(user: UserModel): Promise<void> {
    const wallet = await this.getMTSavingWallet(user.id)

    if (!wallet) {
      throw new Error('unexpected: user wallet not found')
    }

    // Mark user wallet and yield wallet as closed
    this.logger.trace('Closing user wallet MT account')
    await this.modernTreasuryService.closeAccount(wallet.ledgerAccountId)

    this.logger.trace('Closing user wallet MT yield accumulator account')
    await this.modernTreasuryService.closeYieldAccount(user.uid)

    this.logger.trace('Closing user wallet MT incoming account')
    await this.modernTreasuryService.closeIncomingAccount(user.uid)

    this.logger.trace('Closing user wallet MT card account')
    await this.modernTreasuryService.closeCardAccount(user.uid)
  }

  // when this method is updated the mirror unblock method should be updated as well
  async block(user: UserModel): Promise<void> {
    const wallet = await this.getMTSavingWallet(user.id)

    if (!wallet) {
      throw new Error('unexpected: user wallet not found')
    }

    // Mark user wallet and yield wallet as closed
    this.logger.info(`Blocking MT savings wallet for user ${user.uid}`)
    await this.modernTreasuryService.blockAccount(wallet.ledgerAccountId)

    this.logger.info(`Blocking MT yield wallet for user ${user.uid}`)
    await this.modernTreasuryService.blockYieldAccount(user.uid)

    this.logger.info(`Blocking MT card wallet for user ${user.uid}`)
    await this.modernTreasuryService.blockCardAccount(user.uid)
  }

  async unblock(user: UserModel): Promise<void> {
    const wallet = await this.getMTSavingWallet(user.id)

    if (!wallet) {
      throw new Error('unexpected: user wallet not found')
    }

    // Mark user wallet and yield wallet as closed
    this.logger.info(`Unblocking MT savings wallet for user ${user.uid}`)
    await this.modernTreasuryService.unblockAccount(wallet.ledgerAccountId)

    this.logger.info(`Unblocking MT yield wallet for user ${user.uid}`)
    await this.modernTreasuryService.unblockYieldAccount(user.uid)

    this.logger.info(`Unblocking MT card wallet for user ${user.uid}`)
    await this.modernTreasuryService.unblockCardAccount(user.uid)
  }
}
