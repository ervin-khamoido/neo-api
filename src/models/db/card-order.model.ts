2023

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'
import { DB_JSON } from '@ts-awesome/orm-pg'

// Values are based on BridgeCard terminology except for 'Fee''
export enum CardOrderType {
  Fund = 'fund',
  Unload = 'unload',
  Spend = 'spend',
  Reversal = 'reversal',
  InitialFund = 'initial_fund', // For seting up cards with an initial funding amount

  Fee = 'fee', // for charging card creation fees
  SpendFee = 'spend_fee', // for charging the transaction related fees
}

@dbTable('card_order')
export class CardOrderModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'card_id' })
  cardId!: number

  @dbField({ name: 'amount_usdc' })
  amountUsdc!: number

  @dbField({ name: 'fee_usdc' })
  feeUsdc!: number

  @dbField({ name: 'total_usdc' })
  totalUsdc!: number

  @dbField({ name: 'type' })
  type!: CardOrderType

  @dbField({ name: 'provider_transaction_reference', model: String, nullable: true })
  providerTransactionReference!: string | null

  @dbField({ name: 'provider_payload', kind: DB_JSON, model: Object, nullable: true })
  providerPayload!: object | null

  @dbField({ name: 'provider_description', model: String, nullable: true })
  providerDescription!: string | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const CardOrderEntityServiceSymbol = Symbols.serviceFor(CardOrderModel)

export interface ICardOrderEntityService
  extends IEntityService<CardOrderModel, 'orderId', 'createdAt' | 'updatedAt', never> {}
