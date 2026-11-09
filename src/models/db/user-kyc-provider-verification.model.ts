2021

import { dbTable, dbField, reader } from '@ts-awesome/orm'
import { DB_JSON, ISqlQuery } from '@ts-awesome/orm-pg'
import { EntityService, IEntityService, Symbols } from '@ts-awesome/entity'

import { KYCProviderLevelName } from './kyc-level.model'

export enum KYCProviderApplicationStatus {
  Created = 'created',
  Pending = 'pending',
  Retry = 'retry',
  Rejected = 'rejected',
  Approved = 'approved',
  Failed = 'failed',
  // TODO: for the next iteration
  //ManualReview = 'manual_review',
}

@dbTable('user_kyc_provider_verification')
export class UserKYCProviderVerificationModel {
  @dbField({ name: 'user_id', primaryKey: true })
  userId!: number

  @dbField({ name: 'provider_applicant_id' })
  providerApplicantId!: string

  @dbField({ name: 'provider_level_name', primaryKey: true })
  providerLevelName!: KYCProviderLevelName

  @dbField({ name: 'status' })
  status!: KYCProviderApplicationStatus

  @dbField({ name: 'status_reason', model: String, nullable: true })
  statusReason!: string | null

  @dbField({ name: 'status_reason_code', model: String, nullable: true })
  statusReasonCode!: string | null

  @dbField({ name: 'payload', kind: DB_JSON, model: Object, nullable: true })
  payload!: object | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserKYCProviderVerificationEntityServiceSymbol = Symbols.serviceFor(UserKYCProviderVerificationModel)

export interface IUserKYCProviderVerificationEntityService
  extends IEntityService<
    UserKYCProviderVerificationModel,
    'userId' | 'providerLevelName',
    'createdAt' | 'updatedAt',
    never
  > {
  getByUserIdAndLevelNameForUpdate(
    userId: number,
    providerLevelName: string,
  ): Promise<UserKYCProviderVerificationModel | null>
}

export class UserKYCProviderVerificationEntityService
  extends EntityService<
    UserKYCProviderVerificationModel,
    'userId' | 'providerLevelName',
    'createdAt' | 'updatedAt',
    never,
    ISqlQuery
  >
  implements IUserKYCProviderVerificationEntityService {
  async getByUserIdAndLevelNameForUpdate(
    userId: number,
    providerLevelName: string,
  ): Promise<UserKYCProviderVerificationModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql:
        'SELECT * FROM "user_kyc_provider_verification" WHERE user_id=:userId AND provider_level_name=:providerLevelName FOR UPDATE;',
      params: { userId, providerLevelName },
    })

    const result = reader(raw, UserKYCProviderVerificationModel, false)

    return result && result.length ? result[0] : null
  }
}
