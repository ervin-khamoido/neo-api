2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export const FeatureWaitlistUserFeatureUniqueIndex = 'uq_feature_waitlist_user_id_feature'

@dbTable('feature_waitlist', [{ name: FeatureWaitlistUserFeatureUniqueIndex, fields: ['userId', 'feature'] }])
export class FeatureWaitlistModel {
  @dbField({ name: 'user_id', primaryKey: true })
  userId!: number

  @dbField({ primaryKey: true })
  feature!: string

  @dbField
  enabled!: boolean

  @dbField({ name: 'created_at' })
  createdAt!: Date

  @dbField({ name: 'updated_at' })
  updatedAt!: Date
}

export const FeatureWaitlistEntityServiceSymbol = Symbols.serviceFor(FeatureWaitlistModel)

export interface IFeatureWaitlistEntityService
  extends IEntityService<FeatureWaitlistModel, 'userId' | 'feature', 'createdAt' | 'updatedAt', never> {}
