import { inject, injectable } from 'inversify'
import { LoggerFactorySymbol } from '@ts-awesome/logger'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'
import { alias, of } from '@ts-awesome/orm'
import { readable } from '@ts-awesome/model-reader'

import { ReportQueueName } from './common'
import { WorkerFactory, WorkerFactorySymbol } from '../common/worker.factory'
import { ISingleEventBaseService, SingleEventBaseService } from '../common/single-event-base.service'
import { IRedisConfig, RedisConfigSymbol } from '../../lib/models/config'
import {
  activeUserStatuses,
  CardStatus,
  IModernTreasuryWalletEntityService,
  IUserCardEntityService,
  IUserEntityService,
  ModernTreasuryWalletEntityServiceSymbol,
  ModernTreasuryWalletModel,
  UserCardEntityServiceSymbol,
  UserDetailsModel,
  UserEntityServiceSymbol,
  UserStatus,
} from '../../models/db'

import { IUserBalanceService, UserBalanceServiceSymbol } from '../../services/user-balance.service'
import { ReportEventData, ReportType } from './report-event.data'
import { BalanceReportEntityServiceSymbol, IBalanceReportEntityService } from './db/balance-report.model'
import { BridgeCardServiceSymbol, IBridgeCardService } from '../../services/dumb/card/bridgecard.service'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import {
  fromModernTreasuryAmount,
  ICursorBasedResult,
  IModernTreasuryService,
  ModernTreasuryServiceSymbol,
} from '../../services/modern-treasury.service'
import { AccountResponse, IWalletMetadata, WalletType } from '../../models/modern-treasury'
import { sleep } from '../../utils/sleep'
import { IModernTreasuryConfig, ModernTreasuryConfigSymbol } from '../../models/config'
import { ExchangeRateServiceSymbol, IExchangeRateService } from '../../services/exchange-rate.service'

export interface IReportingService extends ISingleEventBaseService {
  start(): Promise<void>
  stop(): Promise<void>
}

@injectable()
export class ReportingService extends SingleEventBaseService<ReportEventData> implements IReportingService {
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(BalanceReportEntityServiceSymbol) balanceReportEntityService!: IBalanceReportEntityService
  @inject(UserCardEntityServiceSymbol) userCardEntityService!: IUserCardEntityService
  @inject(BridgeCardServiceSymbol) bridgecardService!: IBridgeCardService
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService
  @inject(ExchangeRateServiceSymbol) exchangeRateService!: IExchangeRateService

  @inject(ModernTreasuryConfigSymbol) config!: IModernTreasuryConfig

  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  constructor(
    @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory,
    @inject(WorkerFactorySymbol) workerFactory: WorkerFactory,
    @inject(RedisConfigSymbol) redisConfig: IRedisConfig,
  ) {
    super(ReportingService.name, ReportQueueName, ReportEventData, loggerFactory, workerFactory, redisConfig)
  }

  protected async doJob(jobData: ReportEventData): Promise<void> {
    switch (jobData.type) {
      case ReportType.Balance:
        await this.uow.auto(() => this.processBalanceReport())
    }
  }

  private async processBalanceReport() {
    await this.balanceReportEntityService.delete(x => true)

    const exchangeRate = await this.exchangeRateService.getLatestExchangeRate()

    let count = 1000
    let page = 0

    // prepopulate active users in the report
    while (true) {
      const userInfos = await this.userEntityService
        .select()
        .columns(x => [x.id, x.uid, of(UserDetailsModel, 'status')])
        .join(UserDetailsModel, (root, other) => root.id.eq(other.userId))
        .where(() => of(UserDetailsModel, 'status').in(activeUserStatuses))
        .offset(page * count)
        .limit(count)
        .orderBy(x => [x.id])
        .fetch(UserInfo)
      if (userInfos.length === 0) {
        break
      }

      const result: Parameters<IBalanceReportEntityService['addOne']>[0][] = userInfos.map(x => ({
        userId: x.id,
        userUid: x.uid,
        userStatus: x.status,
        buyExchangeRate: exchangeRate.buyExchangeRate,
        sellExchangeRate: exchangeRate.sellExchangeRate,
        primaryWalletBalanceUsdc: 0,
        yieldWalletBalanceUsdc: 0,
        incomingWalletBalanceUsdc: 0,
        activeCardUid: null,
        cardWalletBalanceUsdc: null,
        cardBalanceBridgecardCents: null,
      }))
      await this.balanceReportEntityService.add(result)

      page += 1
    }

    // primary wallet
    await this.pullBalancesForPrimaryWallet()

    // yield wallet
    await this.pullBalancesForYieldWallet()

    // incoming wallet
    await this.pullBalancesForIncomingWallet()

    // card wallet
    await this.pullBalancesForCardWallet()
  }

  private async pullBalancesForPrimaryWallet() {
    let count = 100
    let mtCursor: string | null = null
    while (true) {
      const cursorResult: ICursorBasedResult<AccountResponse> = await this.modernTreasuryService.getAccountsOfType(
        WalletType.Saving,
        this.config.ledgerId,
        count,
        mtCursor,
      )
      if (cursorResult.items.length === 0) {
        break
      }

      const updatePromises = cursorResult.items.map(async x => {
        const owner = (<IWalletMetadata>x.metadata)?.owner
        const user = await this.userEntityService.getOne({ uid: owner })
        if (!user) {
          return null
        }

        await this.balanceReportEntityService.updateOne({
          userId: user.id,
          primaryWalletBalanceUsdc: fromModernTreasuryAmount(x.balances.available_balance.amount),
        })
      })
      await Promise.all(updatePromises)

      mtCursor = cursorResult.cursor

      await sleep(500)
    }
  }

  private async pullBalancesForYieldWallet() {
    let count = 100
    let mtCursor: string | null = null
    while (true) {
      const cursorResult: ICursorBasedResult<AccountResponse> = await this.modernTreasuryService.getAccountsOfType(
        WalletType.Yield,
        this.config.ledgerId,
        count,
        mtCursor,
      )
      if (cursorResult.items.length === 0) {
        break
      }

      const updatePromises = cursorResult.items.map(async x => {
        const owner = (<IWalletMetadata>x.metadata)?.owner
        const user = await this.userEntityService.getOne({ uid: owner })
        if (!user) {
          return null
        }

        await this.balanceReportEntityService.updateOne({
          userId: user.id,
          yieldWalletBalanceUsdc: fromModernTreasuryAmount(x.balances.available_balance.amount),
        })
      })
      await Promise.all(updatePromises)

      mtCursor = cursorResult.cursor

      await sleep(500)
    }
  }

  private async pullBalancesForIncomingWallet() {
    let count = 100
    let mtCursor: string | null = null
    while (true) {
      const cursorResult: ICursorBasedResult<AccountResponse> = await this.modernTreasuryService.getAccountsOfType(
        WalletType.Incoming,
        this.config.ledgerId,
        count,
        mtCursor,
      )
      if (cursorResult.items.length === 0) {
        break
      }

      const updatePromises = cursorResult.items.map(async x => {
        const owner = (<IWalletMetadata>x.metadata)?.owner
        const user = await this.userEntityService.getOne({ uid: owner })
        if (!user) {
          return null
        }

        await this.balanceReportEntityService.updateOne({
          userId: user.id,
          incomingWalletBalanceUsdc: fromModernTreasuryAmount(x.balances.available_balance.amount),
        })
      })
      await Promise.all(updatePromises)

      mtCursor = cursorResult.cursor

      await sleep(500)
    }
  }

  private async pullBalancesForCardWallet() {
    let page = 0
    let count = 20
    while (true) {
      const userCards = await this.userCardEntityService
        .select()
        .columns(x => [
          alias(x.userId, 'userId'),
          alias(x.uid, 'cardUid'),
          alias(x.providerCardId, 'bcCardId'),
          alias(of(ModernTreasuryWalletModel, 'ledgerId'), 'mtLedgerId'),
          alias(of(ModernTreasuryWalletModel, 'ledgerAccountId'), 'mtLedgerAccountId'),
        ])
        .join(ModernTreasuryWalletModel, (root, other) => root.walletId.eq(other.walletId))
        .where(x => x.status.in([CardStatus.CardIssued, CardStatus.CardFrozen]))
        .orderBy(x => [x.id])
        .offset(page * count)
        .limit(count)
        .fetch(UserCardInfo)
      if (userCards.length === 0) {
        break
      }

      const bridgecardBalances = await Promise.all(
        userCards.map(x =>
          x.bcCardId ? this.bridgecardService.getCardBalance(x.bcCardId).catch(ignore => null) : null,
        ),
      )

      const mtLedgerAccountIds = userCards.map(x => x.mtLedgerAccountId)
      const mtAccounts = await this.modernTreasuryService.getAccountsByIds(this.config.ledgerId, mtLedgerAccountIds)

      const updatePromises = userCards.map(async x => {
        const mtAccount = mtAccounts.find(y => y.id === x.mtLedgerAccountId)
        const bcBalance = bridgecardBalances.find(y => y?.data.cardId === x.bcCardId)

        await this.balanceReportEntityService.updateOne({
          userId: x.userId,
          activeCardUid: x.cardUid,
          cardWalletBalanceUsdc: fromModernTreasuryAmount(mtAccount?.balances.available_balance.amount ?? 0),
          cardBalanceBridgecardCents: bcBalance?.data.balance ?? '0',
        })
      })
      await Promise.all(updatePromises)

      page += 1
      await sleep(500)
    }
  }
}

class UserInfo {
  @readable('id') id!: number
  @readable('uid') uid!: string
  @readable('status') status!: UserStatus
}

class UserCardInfo {
  @readable userId!: number
  @readable cardUid!: string
  @readable(String, true) bcCardId!: string | null
  @readable mtLedgerId!: string
  @readable mtLedgerAccountId!: string
}
