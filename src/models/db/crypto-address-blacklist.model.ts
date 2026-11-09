2023

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('crypto_address_blacklist')
export class CryptoAddressBlacklist {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ name: 'address' })
  address!: string

  @dbField({ name: 'blacklist_reason' })
  blacklistReason!: string

  @dbField({ name: 'created_by' })
  createdBy!: string

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const CryptoAddressBlacklistEntityServiceSymbol = Symbols.serviceFor(CryptoAddressBlacklist)

export interface ICryptoAddressBlacklistEntityService
  extends IEntityService<CryptoAddressBlacklist, 'id', 'id' | 'createdAt' | 'updatedAt', never> {}
