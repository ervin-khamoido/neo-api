2021

import { dbTable, dbField, reader } from '@ts-awesome/orm'
import { EntityService, IEntityService, Symbols } from '@ts-awesome/entity'
import { ISqlQuery } from '@ts-awesome/orm-pg'

export enum OnChainOrderType {
  Receive = 'receive',
  Send = 'send',
}

@dbTable('on_chain_order')
export class OnChainOrderModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'type' })
  type!: OnChainOrderType

  @dbField({ name: 'amount_raw' })
  amountRaw!: string

  @dbField
  amount!: string

  @dbField({ name: 'amount_usdc' })
  amountUsdc!: number

  @dbField({ name: 'fee_raw' })
  feeRaw!: string

  @dbField
  fee!: string

  @dbField({ name: 'total_usdc' })
  totalUsdc!: number

  @dbField({ name: 'base_coin' })
  baseCoin!: string

  @dbField
  coin!: string

  @dbField({ name: 'from_address' })
  fromAddress!: string

  @dbField({ name: 'to_address' })
  toAddress!: string

  @dbField({ name: 'provider_transfer_id', nullable: true, model: String })
  providerTransferId!: string | null

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const OnChainOrderEntityServiceSymbol = Symbols.serviceFor(OnChainOrderModel)

export interface IOnChainOrderEntityService
  extends IEntityService<OnChainOrderModel, 'orderId', 'createdAt' | 'updatedAt', never> {
  getForUpdateByProviderTransferId(providerTransferId: string): Promise<OnChainOrderModel | null>
  getForUpdateById(orderId: number): Promise<OnChainOrderModel | null>
}

export class OnChainOrderEntityService
  extends EntityService<OnChainOrderModel, 'orderId', 'createdAt' | 'updatedAt', never, ISqlQuery>
  implements IOnChainOrderEntityService {
  async getForUpdateByProviderTransferId(providerTransferId: string): Promise<OnChainOrderModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: 'SELECT * FROM "on_chain_order" WHERE provider_transfer_id=:providerTransferId FOR UPDATE;',
      params: { providerTransferId },
    })
    const result = reader(raw, OnChainOrderModel, false)

    return result && result.length ? result[0] : null
  }

  async getForUpdateById(orderId: number): Promise<OnChainOrderModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: 'SELECT * FROM "on_chain_order" WHERE order_id=:orderId FOR UPDATE;',
      params: { orderId },
    })
    const result = reader(raw, OnChainOrderModel, false)

    return result && result.length ? result[0] : null
  }
}
