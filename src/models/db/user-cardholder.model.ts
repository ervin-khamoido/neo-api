2023

import { dbTable, dbField, reader } from '@ts-awesome/orm'
import { DB_JSON, ISqlQuery } from '@ts-awesome/orm-pg'
import { EntityService, IEntityService, Symbols } from '@ts-awesome/entity'

export enum CardHolderStatus {
  VerificationPending = 'verification_pending',
  Failure = 'failure',
  Verified = 'verified',
  VerificationFailure = 'verification_failure',
  Deleted = 'deleted',
}

@dbTable('user_cardholder')
export class UserCardHolderModel {
  @dbField({ name: 'user_id', primaryKey: true })
  userId!: number

  @dbField({ name: 'provider' })
  provider!: string

  @dbField({ name: 'provider_cardholder_id', model: String, nullable: true })
  providerCardHolderId!: string | null

  @dbField({ name: 'status' })
  status!: CardHolderStatus

  @dbField({ name: 'status_reason', model: String, nullable: true })
  statusReason!: string | null

  @dbField({ name: 'identity', kind: DB_JSON, model: Object })
  identity!: object

  @dbField({ name: 'provider_payload', kind: DB_JSON, model: Object, nullable: true })
  providerPayload!: object | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserCardHolderEntityServiceSymbol = Symbols.serviceFor(UserCardHolderModel)

export interface IUserCardHolderEntityService
  extends IEntityService<UserCardHolderModel, 'userId', 'createdAt' | 'updatedAt', never> {
  getForUpdateByProviderCardHolderId(providerCardHolderId: string): Promise<UserCardHolderModel | null>
  getForUpdateByUserId(userId: number): Promise<UserCardHolderModel | null>
}

export class UserCardHolderEntityService
  extends EntityService<UserCardHolderModel, 'userId', 'createdAt' | 'updatedAt', never, ISqlQuery>
  implements IUserCardHolderEntityService {
  async getForUpdateByProviderCardHolderId(providerCardHolderId: string): Promise<UserCardHolderModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: 'SELECT * FROM "user_cardholder" WHERE provider_cardholder_id=:providerCardHolderId FOR UPDATE;',
      params: { providerCardHolderId },
    })
    const result = reader(raw, UserCardHolderModel, false)

    return result && result.length ? result[0] : null
  }

  async getForUpdateByUserId(userId: number): Promise<UserCardHolderModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: 'SELECT * FROM "user_cardholder" WHERE user_id=:userId FOR UPDATE;',
      params: { userId },
    })
    const result = reader(raw, UserCardHolderModel, false)

    return result && result.length ? result[0] : null
  }
}
