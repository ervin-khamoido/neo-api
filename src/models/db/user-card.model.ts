2023

import { dbTable, dbField, reader } from '@ts-awesome/orm'
import { EntityService, IEntityService, Symbols } from '@ts-awesome/entity'
import { DB_JSON, DB_UID, ISqlQuery } from '@ts-awesome/orm-pg'
import { CardHolderStatus } from './user-cardholder.model'

export enum CardStatus {
  CardHolderVerificationPending = 'cardholder_verification_pending',
  CardHolderFailure = 'cardholder_failure',
  CardHolderVerified = 'cardholder_verified',
  CardHolderVerificationFailure = 'cardholder_verification_failure',
  CardIssuePending = 'card_issue_pending',
  CardIssueFailure = 'card_issue_failure',
  CardNotIssued = 'card_not_issued', // Status for users who have not been issued a virtual card
  CardIssued = 'card_issued', // Card Issued means that the card has been successfully issued and is in an active status
  CardFrozen = 'card_frozen',
  CardDeleted = 'card_deleted',
}

export const CardHolderStatusToCardStatus: Record<CardHolderStatus, CardStatus> = Object.freeze({
  [CardHolderStatus.VerificationPending]: CardStatus.CardHolderVerificationPending,
  [CardHolderStatus.VerificationFailure]: CardStatus.CardHolderVerificationFailure,
  [CardHolderStatus.Verified]: CardStatus.CardHolderVerified,
  [CardHolderStatus.Failure]: CardStatus.CardHolderFailure,
  [CardHolderStatus.Deleted]: CardStatus.CardDeleted,
})

@dbTable('user_card')
export class UserCardModel {
  @dbField({ primaryKey: true, autoIncrement: true })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ name: 'user_id' })
  userId!: number

  @dbField({ kind: DB_UID, name: 'wallet_id' })
  walletId!: string

  @dbField({ name: 'provider' })
  provider!: string

  @dbField({ name: 'provider_card_id', model: String, nullable: true })
  providerCardId!: string | null

  @dbField({ name: 'status' })
  status!: CardStatus

  @dbField({ name: 'status_reason', model: String, nullable: true })
  statusReason!: string | null

  @dbField({ name: 'provider_payload', kind: DB_JSON, model: Object, nullable: true })
  providerPayload!: object | null

  @dbField({ name: 'last_4_digits', model: String, nullable: true })
  last4Digits!: string | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserCardEntityServiceSymbol = Symbols.serviceFor(UserCardModel)

export interface IUserCardEntityService
  extends IEntityService<UserCardModel, 'id', 'id' | 'uid' | 'createdAt' | 'updatedAt', never> {
  getForUpdateByProviderCardId(providerCardId: string): Promise<UserCardModel | null>
}

export class UserCardEntityService
  extends EntityService<UserCardModel, 'id', 'id' | 'uid' | 'createdAt' | 'updatedAt', never, ISqlQuery>
  implements IUserCardEntityService {
  async getForUpdateByProviderCardId(providerCardId: string): Promise<UserCardModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: 'SELECT * FROM "user_card" WHERE provider_card_id=:providerCardId FOR UPDATE;',
      params: { providerCardId },
    })
    const result = reader(raw, UserCardModel, false)

    return result && result.length ? result[0] : null
  }
}
