2021

import { inject, injectable } from 'inversify'
import { of, or } from '@ts-awesome/orm'

import { NotFoundError } from '../errors'

import { cache, CacheKey } from '../utils/cache-util'

import {
  ILPBankAccountEntityService,
  ILiquidityProviderConfigEntityService,
  LiquidityProviderBankAccountConfigModel,
  LPBankAccountEntityServiceSymbol,
  LiquidityProviderBankAccountModel,
  LPBankAccountConfigEntityServiceSymbol,
  ILiquidityProviderBankAccountConfigEntityService,
  LiquidityProviderConfigEntityServiceSymbol,
  LiquidityProviderConfigModel,
  LiquidityProviderEntityServiceSymbol,
  ILiquidityProviderEntityService,
  LiquidityProviderModel,
  ModernTreasuryWalletModel,
  WalletEntityServiceSymbol,
  IWalletEntityService,
  ModernTreasuryWalletEntityServiceSymbol,
  IModernTreasuryWalletEntityService,
  WalletModel,
} from '../models/db'
import { IModernTreasuryConfig, ModernTreasuryConfigSymbol } from '../models/config'
import { WalletBalanceResult } from '../models/wallet'

import {
  fromModernTreasuryAmount,
  IModernTreasuryService,
  ModernTreasuryServiceSymbol,
} from './modern-treasury.service'

import {
  ILPBankAccountAvailabilityService,
  LPBankAccountAvailabilityServiceSymbol,
} from './lp-bank-account-availability.service'
import { WalletType } from '../models/modern-treasury'

export interface ILiquidityProviderService {
  getLiquidityProvider(liquidityProviderUid: string): Promise<[LiquidityProviderModel, LiquidityProviderConfigModel]>
  getRandomLiquidityProvider(): Promise<
    [
      LiquidityProviderModel,
      LiquidityProviderConfigModel,
      LiquidityProviderBankAccountModel,
      LiquidityProviderBankAccountConfigModel,
    ]
  >
  getRandomLiquidityProviderBankAccount(
    liquidityProviderId: number,
  ): Promise<[LiquidityProviderBankAccountModel, LiquidityProviderBankAccountConfigModel]>
  getBalance(liquidityProviderId: number): Promise<WalletBalanceResult>
  getLiquidityProviderBankAccount(
    lpBankAccountId: number,
  ): Promise<[LiquidityProviderBankAccountModel, LiquidityProviderBankAccountConfigModel]>
}

export const LiquidityProviderServiceSymbol = Symbol.for('ILiquidityProviderService')

@injectable()
export class LiquidityProviderService implements ILiquidityProviderService {
  @inject(LiquidityProviderEntityServiceSymbol)
  liquidityProviderEntityService!: ILiquidityProviderEntityService
  @inject(LiquidityProviderConfigEntityServiceSymbol)
  liquidityProviderConfigEntityService!: ILiquidityProviderConfigEntityService
  @inject(LPBankAccountEntityServiceSymbol)
  liquidityProviderBankAccountEntityService!: ILPBankAccountEntityService
  @inject(LPBankAccountConfigEntityServiceSymbol)
  liquidityProviderBankAccountConfigEntityService!: ILiquidityProviderBankAccountConfigEntityService

  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService
  @inject(ModernTreasuryWalletEntityServiceSymbol)
  modernTreasuryWalletEntityService!: IModernTreasuryWalletEntityService
  @inject(LPBankAccountAvailabilityServiceSymbol)
  lpBankAccountAvailabilityService!: ILPBankAccountAvailabilityService

  readonly modernTreasuryConfig: IModernTreasuryConfig

  constructor(@inject(ModernTreasuryConfigSymbol) mtConfig: IModernTreasuryConfig) {
    this.modernTreasuryConfig = mtConfig
  }

  async getLiquidityProvider(
    liquidityProviderUid: string,
  ): Promise<[LiquidityProviderModel, LiquidityProviderConfigModel]> {
    const liquidityProvider = await this.liquidityProviderEntityService
      .select()
      .where(() => of(LiquidityProviderModel, 'uid').eq(liquidityProviderUid))
      .join(LiquidityProviderConfigModel, (root, other) => root.id.eq(other.liquidityProviderId))
      .where(() => of(LiquidityProviderConfigModel, 'isDeleted').eq(false))
      .fetchOne(LiquidityProviderModel)

    if (!liquidityProvider) {
      throw new NotFoundError(`Liquidity Provider with such uid was not found`)
    }

    const liquidityProviderConfig = await this.liquidityProviderConfigEntityService.getOne({
      liquidityProviderId: liquidityProvider.id,
    })

    return [liquidityProvider, liquidityProviderConfig!]
  }

  async getLiquidityProviderBankAccount(
    lpBankAccountId: number,
  ): Promise<[LiquidityProviderBankAccountModel, LiquidityProviderBankAccountConfigModel]> {
    const lpBankAccount = await this.liquidityProviderBankAccountEntityService
      .select()
      .join(LiquidityProviderBankAccountConfigModel, (root, other) => root.id.eq(other.liquidityProviderBankId))
      .where(x => x.id.eq(lpBankAccountId))
      .where(() => of(LiquidityProviderBankAccountConfigModel, 'isDeleted').eq(false))
      .fetchOne(LiquidityProviderBankAccountModel)

    if (!lpBankAccount) {
      throw new NotFoundError(`Liquidity provider bank account was not found`)
    }

    const lpBankAccountConfig = await this.liquidityProviderBankAccountConfigEntityService.getOne({
      liquidityProviderBankId: lpBankAccount.id,
    })

    return [lpBankAccount, lpBankAccountConfig!]
  }

  async getRandomLiquidityProvider(): Promise<
    [
      LiquidityProviderModel,
      LiquidityProviderConfigModel,
      LiquidityProviderBankAccountModel,
      LiquidityProviderBankAccountConfigModel,
    ]
  > {
    // Get an array of active liquidity provider bank accounts
    const allLiquidityProviderBankAccounts = await this.getActiveLpBankAccounts()

    const bankAccountIds = allLiquidityProviderBankAccounts.map(x => x.id)
    const allLiquidityProviderBankConfigAccounts = await this.liquidityProviderBankAccountConfigEntityService
      .select()
      .where(x => x.liquidityProviderBankId.in(bankAccountIds))
      .fetch(LiquidityProviderBankAccountConfigModel)

    const availableBankAccounts = await this.lpBankAccountAvailabilityService.filterBankAccountsByAvailability([
      ...allLiquidityProviderBankConfigAccounts,
    ])

    if (availableBankAccounts.length === 0) {
      throw new Error('No available Liquidity Providers')
    }

    // Select a random one to use
    const randomLiquidityProviderBankAccountConfig = this.getRandomBankAccount(availableBankAccounts)

    // Get the liquidity provider bank account config
    const liquidityProviderBankAccount = allLiquidityProviderBankAccounts.find(
      x => x.id === randomLiquidityProviderBankAccountConfig.liquidityProviderBankId,
    )

    // Get the liquidity provider
    const liquidityProviderPromise = this.liquidityProviderEntityService.getOne({
      id: liquidityProviderBankAccount!.liquidityProviderId,
    })

    // Get the liquidity provider config
    const liquidityProviderConfigPromise = this.liquidityProviderConfigEntityService.getOne({
      liquidityProviderId: liquidityProviderBankAccount!.liquidityProviderId,
    })

    const [liquidityProvider, liquidityProviderConfig] = await Promise.all([
      liquidityProviderPromise,
      liquidityProviderConfigPromise,
    ])

    return [
      liquidityProvider!,
      liquidityProviderConfig!,
      liquidityProviderBankAccount!,
      randomLiquidityProviderBankAccountConfig!,
    ]
  }

  async getRandomLiquidityProviderBankAccount(
    liquidityProviderId: number,
  ): Promise<[LiquidityProviderBankAccountModel, LiquidityProviderBankAccountConfigModel]> {
    // Get an array of active bank accounts for the specified liquidity provider
    const lpBankAccounts = await this.liquidityProviderBankAccountEntityService
      .select()
      .join(LiquidityProviderBankAccountConfigModel, (root, other) => root.id.eq(other.liquidityProviderBankId))
      .where(x => x.liquidityProviderId.eq(liquidityProviderId))
      .where(() => of(LiquidityProviderBankAccountConfigModel, 'isDeleted').eq(false))
      .fetch(LiquidityProviderBankAccountModel)

    const bankAccountIds = lpBankAccounts.map(x => x.id)
    const lpBankAccountConfigs = await this.liquidityProviderBankAccountConfigEntityService
      .select()
      .where(x => x.liquidityProviderBankId.in(bankAccountIds))
      .fetch(LiquidityProviderBankAccountConfigModel)

    const availableBankAccounts = await this.lpBankAccountAvailabilityService.filterBankAccountsByAvailability([
      ...lpBankAccountConfigs,
    ])

    if (availableBankAccounts.length === 0) {
      throw new Error('No available Liquidity Providers')
    }

    // Select a random one to use
    const randomLiquidityProviderBankAccountConfig = this.getRandomBankAccount(availableBankAccounts)

    // Get the liquidity provider bank account config
    const liquidityProviderBankAccount = lpBankAccounts.find(
      x => x.id === randomLiquidityProviderBankAccountConfig.liquidityProviderBankId,
    )

    return [liquidityProviderBankAccount!, randomLiquidityProviderBankAccountConfig]
  }

  async getBalance(liquidityProviderId: number): Promise<WalletBalanceResult> {
    const wallet = await this.modernTreasuryWalletEntityService
      .select()
      .join(LiquidityProviderConfigModel, (root, other) => root.walletId.eq(other.walletId))
      .where(x => of(LiquidityProviderConfigModel, 'liquidityProviderId').eq(liquidityProviderId))
      .fetchOne(ModernTreasuryWalletModel)

    if (!wallet) {
      throw new Error('unexpected: lp agent does not have a wallet')
    }

    const accountResponse = await this.modernTreasuryService.getAccount(wallet.ledgerAccountId)
    if (!accountResponse) {
      throw new Error('unexpected: lp agent does not have an external wallet')
    }

    const rawBalance = accountResponse.balances?.posted_balance?.amount ?? 0
    const balance = fromModernTreasuryAmount(rawBalance)

    return {
      balance: balance,
      currency: 'USD',
      lockVersion: accountResponse.lock_version,
    }
  }

  private getRandomBankAccount(
    bankAccounts: LiquidityProviderBankAccountConfigModel[],
  ): LiquidityProviderBankAccountConfigModel {
    return bankAccounts[Math.floor(Math.random() * bankAccounts.length)]
  }

  @cache(CacheKey.LpBankAccounts)
  private async getActiveLpBankAccounts(): Promise<readonly LiquidityProviderBankAccountModel[]> {
    // Get an array of liquidity provider bank accounts (that have not been marked as deleted)
    const activeLiquidityProviderBankAccounts = await this.liquidityProviderBankAccountEntityService
      .select()
      .join(LiquidityProviderBankAccountConfigModel, (root, other) => root.id.eq(other.liquidityProviderBankId))
      .join(LiquidityProviderConfigModel, (root, other) => root.liquidityProviderId.eq(other.liquidityProviderId))
      .where(() => of(LiquidityProviderBankAccountConfigModel, 'isDeleted').eq(false))
      .where(() => of(LiquidityProviderConfigModel, 'isDeleted').eq(false))
      .fetch(LiquidityProviderBankAccountModel)

    return activeLiquidityProviderBankAccounts
  }
}
