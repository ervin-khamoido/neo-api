2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum KYCLevel {
  KYC1 = 'kyc_1',
  KYC2 = 'kyc_2',
  KYC3 = 'kyc_3',
}

// IMPORTANT NOTE: These values should correspond to the levels in Sumsub and in our database
export enum KYCProviderLevelName {
  KYCLevel2 = 'kyc_level_2',
  // dev, feature testing
  KYCLevel2Dev = 'kyc_level_2_dev',
  KYCLevel2FT = 'kyc_level_2_ft',
}

export const KYCLevel2Levels = [
  KYCProviderLevelName.KYCLevel2,
  KYCProviderLevelName.KYCLevel2Dev,
  KYCProviderLevelName.KYCLevel2FT,
]

@dbTable('kyc_level')
export class KYCLevelModel {
  @dbField({ primaryKey: true, autoIncrement: true })
  id!: number

  @dbField
  code!: KYCLevel

  @dbField({ name: 'provider_level_name', model: String, nullable: true })
  providerLevelName!: KYCProviderLevelName | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const KYCLevelEntityServiceSymbol = Symbols.serviceFor(KYCLevelModel)

export interface IKYCLevelEntityService
  extends IEntityService<KYCLevelModel, 'id', 'id' | 'createdAt' | 'updatedAt', never> {}
