2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('fee')
export class FeeModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ name: 'sell_percentage_fee' })
  sellPercentageFee!: number

  @dbField({ name: 'sell_flat_fee' })
  sellFlatFee!: number

  @dbField({ name: 'purchase_percentage_fee' })
  purchasePercentageFee!: number

  @dbField({ name: 'purchase_flat_fee' })
  purchaseFlatFee!: number

  @dbField({ name: 'create_card_fee_amount_usdc' })
  createCardFeeAmountUsdc!: number

  @dbField({ name: 'send_on_chain_percentage_fee', model: Number, nullable: true })
  sendOnChainPercentageFee!: number | null

  @dbField({ name: 'send_on_chain_flat_fee', model: Number, nullable: true })
  sendOnChainFlatFee!: number | null

  @dbField({ name: 'send_on_chain_min_fee', model: Number, nullable: true })
  sendOnChainMinFee!: number | null

  @dbField({ name: 'send_on_chain_max_fee', model: Number, nullable: true })
  sendOnChainMaxFee!: number | null

  @dbField({ name: 'receive_on_chain_percentage_fee', model: Number, nullable: true })
  receiveOnChainPercentageFee!: number | null

  @dbField({ name: 'receive_on_chain_flat_fee', model: Number, nullable: true })
  receiveOnChainFlatFee!: number | null

  @dbField({ name: 'receive_on_chain_min_fee', model: Number, nullable: true })
  receiveOnChainMinFee!: number | null

  @dbField({ name: 'receive_on_chain_max_fee', model: Number, nullable: true })
  receiveOnChainMaxFee!: number | null

  /**
   * @deprecated The property should not be used after app version 1.5.0 gets deprecated.
   */
  @dbField({ name: 'company_fee_multiplier' })
  companyFeeMultiplier!: number

  /**
   * @deprecated The property should not be used after app version 1.5.0 gets deprecated.
   */
  @dbField({ name: 'agent_fee_amount_ngn' })
  agentFeeAmountNgn!: number

  @dbField({ name: 'applies_at' })
  appliesAt!: Date

  @dbField
  source!: string

  @dbField({ name: 'created_at' })
  createdAt!: Date

  @dbField({ name: 'updated_at' })
  updatedAt!: Date
}

export const FeeEntityServiceSymbol = Symbols.serviceFor(FeeModel)

export interface IFeeEntityService extends IEntityService<FeeModel, 'id', 'id' | 'createdAt' | 'updatedAt', never> {}
