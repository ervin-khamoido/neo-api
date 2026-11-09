import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

export enum AmbassadorLevel {
  Level0 = 'level_0',
  Level1 = 'level_1',
}

@dbTable('ambassador_level')
export class AmbassadorLevelModel {
  @dbField({ primaryKey: true, autoIncrement: true })
  id!: number

  @dbField
  code!: AmbassadorLevel

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

export const AmbassadorLevelEntityServiceSymbol = Symbols.serviceFor(AmbassadorLevelModel)

export interface IAmbassadorLevelEntityService
  extends IEntityService<AmbassadorLevelModel, 'id', 'createdAt' | 'updatedAt', never> {}
