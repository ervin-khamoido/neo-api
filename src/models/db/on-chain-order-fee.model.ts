2023

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_JSON, DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'
import { IOnChainFeeConfig } from '../on-chain'

@dbTable('on_chain_order_fee')
export class OnChainOrderFeeModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'neo_bank_fee_usdc' })
  neoBankFeeUsdc!: number

  @dbField({ name: 'network_fee_usdc' })
  networkFeeUsdc!: number

  @dbField({ name: 'total_fee_usdc' })
  totalFeeUsdc!: number

  @dbField({ name: 'fee_config', kind: DB_JSON, model: Object, nullable: true })
  feeConfig!: IOnChainFeeConfig | null

  @dbField({ name: 'created_at' })
  createdAt!: Date

  @dbField({ name: 'updated_at' })
  updatedAt!: Date
}

export const OnChainOrderFeeEntityServiceSymbol = Symbols.serviceFor(OnChainOrderFeeModel)

export interface IOnChainOrderFeeEntityService
  extends IEntityService<OnChainOrderFeeModel, 'orderId', 'createdAt' | 'updatedAt', 'feeConfig'> {}
