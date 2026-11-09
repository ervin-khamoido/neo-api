2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('liquidity_provider_bank_account_config')
export class LiquidityProviderBankAccountConfigModel {
  @dbField({
    name: 'liquidity_provider_bank_id',
    primaryKey: true,
  })
  liquidityProviderBankId!: number

  @dbField({ name: 'is_deleted' })
  isDeleted!: boolean

  @dbField({ name: 'helpdesk_agent_group_id', nullable: true, model: String })
  helpdeskAgentGroupId!: string | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const LPBankAccountConfigEntityServiceSymbol = Symbols.serviceFor(LiquidityProviderBankAccountConfigModel)

export interface ILiquidityProviderBankAccountConfigEntityService
  extends IEntityService<
    LiquidityProviderBankAccountConfigModel,
    'liquidityProviderBankId',
    'updatedAt' | 'createdAt',
    never
  > {}
