2023

import { dbTable, dbField, reader } from '@ts-awesome/orm'
import { EntityService, IEntityService, Symbols } from '@ts-awesome/entity'
import { DB_JSON, DB_UID, ISqlQuery } from '@ts-awesome/orm-pg'

export enum UserCryptoWalletStatus {
  Pending = 'pending',
  Created = 'success',
  Failure = 'failure',
}

@dbTable('user_crypto_wallet')
export class UserCryptoWalletModel {
  @dbField({ primaryKey: true, autoIncrement: true })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ name: 'user_id' })
  userId!: number

  @dbField
  status!: UserCryptoWalletStatus

  @dbField
  provider!: string

  @dbField({ name: 'provider_address_id', model: String, nullable: true })
  providerAddressId!: string | null

  @dbField({ model: String, nullable: true })
  address!: string | null

  @dbField({ name: 'provider_payload', kind: DB_JSON, model: Object, nullable: true })
  providerPayload!: object | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserCryptoWalletEntityServiceSymbol = Symbols.serviceFor(UserCryptoWalletModel)

export interface IUserCryptoWalletEntityService
  extends IEntityService<
    UserCryptoWalletModel,
    'id',
    'id' | 'uid' | 'createdAt' | 'updatedAt',
    'providerAddressId' | 'address' | 'providerPayload'
  > {
  getForUpdateByProviderAddressId(providerAddressId: string): Promise<UserCryptoWalletModel | null>
}

export class UserCryptoWalletEntityService
  extends EntityService<
    UserCryptoWalletModel,
    'id',
    'id' | 'uid' | 'createdAt' | 'updatedAt',
    'providerAddressId' | 'address' | 'providerPayload',
    ISqlQuery
  >
  implements IUserCryptoWalletEntityService {
  async getForUpdateByProviderAddressId(providerAddressId: string): Promise<UserCryptoWalletModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: 'SELECT * FROM "user_crypto_wallet" WHERE provider_address_id=:providerAddressId FOR UPDATE;',
      params: { providerAddressId },
    })
    const result = reader(raw, UserCryptoWalletModel, false)

    return result && result.length ? result[0] : null
  }
}
