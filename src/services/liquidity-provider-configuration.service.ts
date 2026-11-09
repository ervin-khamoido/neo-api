2021

import { inject, injectable } from 'inversify'

import {
  ILiquidityProviderBankAccountConfigEntityService,
  ILiquidityProviderConfigEntityService,
  ILiquidityProviderEntityService,
  ILPBankAccountEntityService,
  IModernTreasuryWalletEntityService,
  IWalletEntityService,
  LiquidityProviderBankAccountConfigModel,
  LiquidityProviderBankAccountModel,
  LiquidityProviderConfigEntityServiceSymbol,
  LiquidityProviderConfigModel,
  LiquidityProviderEntityServiceSymbol,
  LiquidityProviderModel,
  LPBankAccountConfigEntityServiceSymbol,
  LPBankAccountEntityServiceSymbol,
  ModernTreasuryWalletEntityServiceSymbol,
  MTNormalBalanceType,
  WalletEntityServiceSymbol,
  WalletModel,
} from '../models/db'

import { LiquidityProviderInput } from '../models/request/liquidity-provider.input'
import { LiquidityProviderBankAccountInput } from '../models/request/liquidity-provider-bank-account.input'

import { IModernTreasuryService, ModernTreasuryServiceSymbol } from './modern-treasury.service'
import { IModernTreasuryConfig, ModernTreasuryConfigSymbol } from '../models/config'
import { WalletCategoryType, WalletType } from '../models/modern-treasury'
import { FreshdeskConfigurationServiceSymbol, IFreshdeskConfigurationService } from './freshdesk-configuration.service'
import { AirtableServiceSymbol, IAirtableService } from './airtable.service'
import { CacheKey, invalidateCache } from '../utils/cache-util'

export interface ILiquidityProviderConfigurationService {
  createLiquidityProvider(
    model: LiquidityProviderInput,
  ): Promise<[LiquidityProviderModel, LiquidityProviderConfigModel]>
  createLiquidityProviderBankAccount(
    liquidityProviderId: number,
    model: LiquidityProviderBankAccountInput,
  ): Promise<[LiquidityProviderBankAccountModel, LiquidityProviderBankAccountConfigModel]>
}

export const LiquidityProviderConfigurationServiceSymbol = Symbol.for('ILiquidityProviderConfigurationService')

@injectable()
export class LiquidityProviderConfigurationService implements ILiquidityProviderConfigurationService {
  @inject(LiquidityProviderEntityServiceSymbol)
  liquidityProviderEntityService!: ILiquidityProviderEntityService
  @inject(LiquidityProviderConfigEntityServiceSymbol)
  liquidityProviderConfigEntityService!: ILiquidityProviderConfigEntityService
  @inject(LPBankAccountEntityServiceSymbol)
  liquidityProviderBankAccountEntityService!: ILPBankAccountEntityService
  @inject(LPBankAccountConfigEntityServiceSymbol)
  liquidityProviderBankAccountConfigEntityService!: ILiquidityProviderBankAccountConfigEntityService
  @inject(FreshdeskConfigurationServiceSymbol)
  freshdeskConfigurationService!: IFreshdeskConfigurationService

  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService
  @inject(WalletEntityServiceSymbol) walletEntityService!: IWalletEntityService
  @inject(ModernTreasuryWalletEntityServiceSymbol)
  modernTreasuryWalletEntityService!: IModernTreasuryWalletEntityService
  @inject(AirtableServiceSymbol) airtableService!: IAirtableService

  readonly modernTreasuryConfig: IModernTreasuryConfig

  constructor(@inject(ModernTreasuryConfigSymbol) mtConfig: IModernTreasuryConfig) {
    this.modernTreasuryConfig = mtConfig
  }

  async createLiquidityProvider(
    model: LiquidityProviderInput,
  ): Promise<[LiquidityProviderModel, LiquidityProviderConfigModel]> {
    // create liquidity provider
    const liquidityProvider = await this.liquidityProviderEntityService.addOne({
      name: model.name,
    })

    // create a wallet
    const wallet = await this.createWallet(liquidityProvider)

    // create liquidity provider config
    const liquidityProviderConfig = await this.liquidityProviderConfigEntityService.addOne({
      helpdeskRepresentativeGroupId: model.helpDeskRepresentativeGroupId,
      liquidityProviderId: liquidityProvider.id,
      walletId: wallet.id,
      isDeleted: false,
    })

    return [liquidityProvider, liquidityProviderConfig]
  }

  @invalidateCache(CacheKey.LpBankAccounts)
  async createLiquidityProviderBankAccount(
    liquidityProviderId: number,
    model: LiquidityProviderBankAccountInput,
  ): Promise<[LiquidityProviderBankAccountModel, LiquidityProviderBankAccountConfigModel]> {
    const liquidityProviderBankAccount = await this.liquidityProviderBankAccountEntityService.addOne({
      bankName: model.bankName,
      bankAccountNumber: model.bankAccountNumber,
      bankAccountName: model.bankAccountName,
      liquidityProviderId: liquidityProviderId,
    })

    // create bank account group in FreshDesk
    const group = await this.freshdeskConfigurationService.createGroup({
      name: model.helpDeskGroup.name,
      description: model.helpDeskGroup.description,
    })

    // add bank account to the DB
    const liquidityProviderBankAccountConfig = await this.liquidityProviderBankAccountConfigEntityService.addOne({
      liquidityProviderBankId: liquidityProviderBankAccount.id,
      helpdeskAgentGroupId: '' + group.id,
      isDeleted: false,
    })

    // add bank account to airtable
    await this.airtableService.addLPBankAccountAvailability({
      is_available: false,
      bank_name: model.bankName,
      bank_account_name: model.bankAccountName,
      bank_account_number: model.bankAccountNumber,
      helpdesk_group_id: liquidityProviderBankAccountConfig.helpdeskAgentGroupId,
      helpdesk_group_name: group.name ?? null,
    })

    return [liquidityProviderBankAccount, liquidityProviderBankAccountConfig]
  }

  private async createWallet(liquidityProvider: LiquidityProviderModel): Promise<WalletModel> {
    const wallet = await this.walletEntityService.addOne({ type: WalletType.Regular })

    const walletName = `lp:${liquidityProvider.uid}:${wallet.uid}`

    const account = await this.modernTreasuryService.createAccount({
      name: walletName,
      ledger_id: this.modernTreasuryConfig.ledgerId,
      normal_balance: MTNormalBalanceType.Credit,
      metadata: {
        category: WalletCategoryType.LP,
        type: WalletType.Regular,
        owner: liquidityProvider.uid,
        wallet: wallet.uid,
      },
    })

    await this.modernTreasuryWalletEntityService.addOne({
      walletId: wallet.id,
      name: account.name,
      description: account.description ?? null,
      ledgerAccountId: account.id,
      ledgerId: account.ledger_id,
      normalBalance: account.normal_balance,
      object: account.object ?? '',
      callbackUrl: null,
    })

    return wallet
  }
}
