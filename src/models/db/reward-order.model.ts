import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'
import { DB_JSON } from '@ts-awesome/orm-pg'

import { RewardOrderCashbackDetails } from '../cashback/cashback-details'
import { PromotionCampaignType } from './promotion-campaign.model'

// DO NOT CHANGE VALUES / ADD ONLY
export enum RewardType {
  // This is the reward an existing user gets when he saves in USDC
  Cashback_Buy = 'cashback.buy',

  // This is the reward an existing user gets when someone they invite uses their referral code to sign up for the Neo Bank app.
  Referral_Referrer = 'referral.referrer',

  // This is the reward our operations team gives to users for special promotional campaigns (ex: Neo Bank App Saturdays)
  Promotion_Campaign = 'promotion.campaign',
}

export interface IReferralRewardDetails {
  type: RewardType.Referral_Referrer
  version: 'v1'
  refereeSavedAmount: number
  referrerPayoutsCount: number
  maxReferrerPayoutsCount: number | null
  orderIds: number[]
  orderReferenceNumbers: string[]
  minRefereeSaveAmountUsdc: number
}

export interface IPromotionCampaignDetails {
  type: RewardType.Promotion_Campaign
  version: 'v1'
  createdBy: string // the person who created the order
  campaignTag: string
  campaignType: PromotionCampaignType
  campaignCreatedBy: string // the person who created the campaign
}

export type RewardOrderDetails = IReferralRewardDetails | RewardOrderCashbackDetails | IPromotionCampaignDetails

@dbTable('reward_order')
export class RewardOrderModel {
  @dbField({ name: 'order_id', primaryKey: true })
  orderId!: number

  @dbField({ name: 'reward_type' })
  rewardType!: RewardType

  @dbField({ name: 'title' })
  title!: string

  @dbField({ name: 'description', model: String, nullable: true })
  description?: string | null

  @dbField({ name: 'amount_usdc' })
  amountUsdc!: number

  @dbField({ name: 'amount' })
  amount!: number

  @dbField({ name: 'exchange_rate' })
  exchangeRate!: number

  @dbField({ name: 'from' })
  from!: string

  @dbField({ name: 'to_wallet_id' })
  toWalletId!: string

  @dbField({ name: 'details', kind: DB_JSON, model: Object })
  details!: RewardOrderDetails

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const RewardOrderEntityServiceSymbol = Symbols.serviceFor(RewardOrderModel)

export interface IRewardOrderEntityService
  extends IEntityService<RewardOrderModel, 'orderId', 'createdAt' | 'updatedAt', never> {}
