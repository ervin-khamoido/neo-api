import { IEntityService, Symbols } from '@ts-awesome/entity'
import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID } from '@ts-awesome/orm-pg'

export enum PromotionCampaignType {
  NeoBankAppSaturday = 'neo_bank_app_saturday',
}

export const PromotionCampaignTypes = Object.values(PromotionCampaignType)

@dbTable('promotion_campaign')
export class PromotionCampaignModel {
  @dbField({ autoIncrement: true, primaryKey: true })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ name: 'tag' })
  tag!: string

  @dbField({ name: 'type' })
  type!: PromotionCampaignType

  @dbField({ name: 'created_by' })
  createdBy!: string

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const PromotionCampaignEntityServiceSymbol = Symbols.serviceFor(PromotionCampaignModel)

export interface IPromotionCampaignEntityService
  extends IEntityService<PromotionCampaignModel, 'id', 'id' | 'uid' | 'updatedAt' | 'createdAt', never> {}
