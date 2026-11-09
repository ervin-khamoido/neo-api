2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('purchase_order')
export class PurchaseOrderModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'expires_at' })
  expiresAt!: Date

  @dbField({ name: 'include_fees' })
  includeFees!: boolean

  @dbField({ name: 'amount' })
  amount!: number

  @dbField({ name: 'exchange_rate' })
  exchangeRate!: number

  @dbField({ name: 'fee_total', model: Number })
  feeTotal!: number

  /**
   * @deprecated The property should not be used after app version 1.5.0 gets deprecated.
   */
  @dbField({ name: 'fee', nullable: true, model: Number })
  fee!: number | null

  /**
   * @deprecated The property should not be used after app version 1.5.0 gets deprecated.
   */
  @dbField({ name: 'agent_fee', nullable: true, model: Number })
  agentFee!: number | null

  @dbField({ name: 'total' })
  total!: number

  @dbField({ name: 'total_usdc' })
  totalUsdc!: number

  @dbField({ name: 'user_bank_account_id' })
  userBankAccountId!: number

  @dbField({ name: 'liquidity_provider_bank_account_id' })
  liquidityProviderBankAccountId!: number

  @dbField({ name: 'liquidity_provider_id' })
  liquidityProviderId!: number

  @dbField({ name: 'from_wallet_id' })
  fromWalletId!: string

  @dbField({ name: 'to_wallet_id' })
  toWalletId!: string

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const PurchaseOrderEntityServiceSymbol = Symbols.serviceFor(PurchaseOrderModel)

export interface IPurchaseOrderEntityService
  extends IEntityService<PurchaseOrderModel, 'orderId' | 'createdAt', 'createdAt' | 'updatedAt', never> {}
