2021

import { inject, injectable } from 'inversify'

import { cache, CacheKey } from '../utils/cache-util'

import { FeatureConfigSymbol, IFeatureConfig } from '../models/config/feature.config'
import { LiquidityProviderBankAccountConfigModel } from '../models/db'

import { AirtableServiceSymbol, IAirtableService } from './airtable.service'

export interface ILPBankAccountAvailabilityService {
  filterBankAccountsByAvailability(
    model: LiquidityProviderBankAccountConfigModel[],
  ): Promise<LiquidityProviderBankAccountConfigModel[]>
}

export const LPBankAccountAvailabilityServiceSymbol = Symbol.for('ILPBankAccountAvailabilityService')

@injectable()
export class LPBankAccountAvailabilityService implements ILPBankAccountAvailabilityService {
  @inject(AirtableServiceSymbol) airtableService!: IAirtableService

  readonly bankAccountAvailabilityEnabled: boolean

  constructor(@inject(FeatureConfigSymbol) featureConfig: IFeatureConfig) {
    this.bankAccountAvailabilityEnabled = featureConfig.lpBankAccountAvailability
  }

  async filterBankAccountsByAvailability(
    bankAccounts: LiquidityProviderBankAccountConfigModel[],
  ): Promise<LiquidityProviderBankAccountConfigModel[]> {
    if (!this.bankAccountAvailabilityEnabled) {
      return bankAccounts
    }

    const availableGroups = await this.fetchBankAccountAvailableGroups()
    if (!availableGroups || !availableGroups.length) {
      return []
    }

    const availableBankAccounts = bankAccounts.filter(
      x => !!x.helpdeskAgentGroupId && availableGroups.includes(x.helpdeskAgentGroupId),
    )

    return availableBankAccounts
  }

  @cache(CacheKey.LpBankAccountGroupsAvailability)
  private async fetchBankAccountAvailableGroups(): Promise<string[] | null> {
    let availableGroupIds: string[] = []

    const availabilities = await this.airtableService.getLPBankAccountAvailabilities()
    availableGroupIds = availabilities
      .filter(x => x.is_available && !!x.helpdesk_group_id)
      .map(x => <string>x.helpdesk_group_id)

    return availableGroupIds
  }
}
