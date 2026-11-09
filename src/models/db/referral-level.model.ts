2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum ReferralLevel {
  Level0 = 'level_0',
}

@dbTable('referral_level')
export class ReferralLevelModel {
  @dbField({ primaryKey: true, autoIncrement: true })
  id!: number

  @dbField
  code!: ReferralLevel

  @dbField('flat_reward')
  flatReward!: number

  @dbField('created_by')
  createdBy!: string

  @dbField({ name: 'max_payouts_count', model: Number, nullable: true })
  maxPayoutsCount!: number | null

  @dbField('min_referee_save_amount_usdc')
  minRefereeSaveAmountUsdc!: number

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const ReferralLevelEntityServiceSymbol = Symbols.serviceFor(ReferralLevelModel)

export interface IReferralLevelEntityService
  extends IEntityService<ReferralLevelModel, 'id', 'createdAt' | 'updatedAt', never> {}
