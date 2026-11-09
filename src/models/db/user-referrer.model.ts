2021

import { dbTable, dbField, reader } from '@ts-awesome/orm'
import { EntityService, IEntityService, Insertable, Symbols } from '@ts-awesome/entity'
import { ISqlQuery } from '@ts-awesome/orm-pg'

@dbTable('user_referrer')
export class UserReferrerModel {
  @dbField({ name: 'user_id', primaryKey: true })
  userId!: number

  @dbField('referral_code')
  referralCode!: string

  @dbField({ name: 'referral_link', model: String, nullable: true })
  referralLink!: string | null

  @dbField('referral_level_id')
  referralLevelId!: number

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const UserReferrerEntityServiceSymbol = Symbols.serviceFor(UserReferrerModel)

type IBaseEntityService = IEntityService<UserReferrerModel, 'userId', 'createdAt' | 'updatedAt', never>
type IUserReferrerInsert = Insertable<UserReferrerModel, 'createdAt' | 'updatedAt'>

export interface IUserReferrerEntityService extends IBaseEntityService {
  insertDoNothingOnConflict(payload: IUserReferrerInsert): Promise<UserReferrerModel | null>
}

export class UserReferrerEntityService
  extends EntityService<UserReferrerModel, 'userId', 'createdAt' | 'updatedAt', never, ISqlQuery>
  implements IUserReferrerEntityService {
  async insertDoNothingOnConflict(payload: IUserReferrerInsert): Promise<UserReferrerModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: `INSERT INTO "user_referrer" (user_id, referral_code, referral_link, referral_level_id)
         VALUES (:userId, :referralCode, :referralLink, :referralLevelId) 
         ON CONFLICT DO NOTHING RETURNING *;`,
      params: { ...payload },
    })
    const result = reader(raw, UserReferrerModel, false)

    return result && result.length ? result[0] : null
  }
}
