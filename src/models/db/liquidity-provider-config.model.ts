2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('liquidity_provider_config')
export class LiquidityProviderConfigModel {
  @dbField({
    name: 'liquidity_provider_id',
    primaryKey: true,
  })
  liquidityProviderId!: number

  @dbField({ name: 'is_deleted' })
  isDeleted!: boolean

  @dbField({ name: 'wallet_id' })
  walletId!: string

  @dbField({ name: 'helpdesk_representative_group_id', nullable: true, model: String })
  helpdeskRepresentativeGroupId!: string | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const LiquidityProviderConfigEntityServiceSymbol = Symbols.serviceFor(LiquidityProviderConfigModel)

export interface ILiquidityProviderConfigEntityService
  extends IEntityService<LiquidityProviderConfigModel, 'liquidityProviderId', 'updatedAt' | 'createdAt', never> {}
