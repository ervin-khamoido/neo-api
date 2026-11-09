2023

import { PromotionCampaignType } from '../db'

export interface ICreatePromotionCampaignInput {
  tag: string
  type: PromotionCampaignType
  createdBy: string
}
