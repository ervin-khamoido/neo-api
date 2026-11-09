2021

import { dbTable, dbField, reader } from '@ts-awesome/orm'
import { EntityService, IEntityService, Symbols } from '@ts-awesome/entity'
import { DB_JSON, ISqlQuery } from '@ts-awesome/orm-pg'

export interface IUserReferrerPayoutDetailsV1 {
  version: 'v1'
  minRefereeSaveAmountUsdc: number
}

export interface IUserReferrerRejectedRewardDetailsV1 {
  version: 'v1'
  refereeSavedAmount: number
  referrerPayoutsCount: number
  maxReferrerPayoutsCount: number
  orderIds: number[]
  orderReferenceNumbers: string[]
  error?: string
}

export type IUserReferrerPayoutDetails = IUserReferrerPayoutDetailsV1
export type IUserReferrerRejectedRewardDetails = IUserReferrerRejectedRewardDetailsV1 | null

@dbTable('user_referrer_payout')
export class UserReferrerPayoutModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField('referee_id')
  refereeId!: number

  @dbField('referrer_id')
  referrerId!: number

  @dbField
  amount!: number

  @dbField({ kind: DB_JSON, model: Object })
  details!: IUserReferrerPayoutDetails

  @dbField({ name: 'rejected_reward_details', kind: DB_JSON, model: Object, nullable: true })
  rejectedRewardDetails!: IUserReferrerRejectedRewardDetails

  @dbField({ name: 'reward_order_id', model: Number, nullable: true })
  rewardOrderId!: number | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserReferrerPayoutEntityServiceSymbol = Symbols.serviceFor(UserReferrerPayoutModel)

export interface IUserReferrerPayoutEntityService
  extends IEntityService<UserReferrerPayoutModel, 'id', 'id' | 'createdAt' | 'updatedAt', never> {
  getPendingPayoutForUpdate(refereeId: number): Promise<UserReferrerPayoutModel | null>
  getAllPayoutForUpdate(referrerId: number): Promise<readonly UserReferrerPayoutModel[]>
}

export class UserReferrerPayoutEntityService
  extends EntityService<UserReferrerPayoutModel, 'id', 'id' | 'createdAt' | 'updatedAt', never, ISqlQuery>
  implements IUserReferrerPayoutEntityService {
  async getPendingPayoutForUpdate(refereeId: number): Promise<UserReferrerPayoutModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: `
            SELECT * FROM "user_referrer_payout" 
            WHERE referee_id=:refereeId 
                AND reward_order_id IS NULL 
                AND (rejected_reward_details = 'null' OR rejected_reward_details IS NULL)
            FOR UPDATE;`,
      params: { refereeId },
    })
    const result = reader(raw, UserReferrerPayoutModel, false)

    return result && result.length ? result[0] : null
  }

  async getAllPayoutForUpdate(referrerId: number): Promise<readonly UserReferrerPayoutModel[]> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: 'SELECT * FROM "user_referrer_payout" WHERE referrer_id=:referrerId FOR UPDATE;',
      params: { referrerId },
    })

    return reader(raw, UserReferrerPayoutModel, false)
  }
}
