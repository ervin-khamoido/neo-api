2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { PromotionCampaignType, PromotionCampaignTypes } from '../db'

@OpenApiSchema({
  description: 'Promotion campaign reward input model',
})
export class PromotionCampaignRewardInput {
  @OpenApiSchemaProperty({
    description: 'Unique tag of the campaign',
    writeOnly: true,
  })
  @readable(String)
  campaignTag!: string

  @OpenApiSchemaProperty({
    description: 'Type of campaign',
    enum: PromotionCampaignTypes,
    writeOnly: true,
  })
  @readable(String)
  campaignType!: PromotionCampaignType

  @OpenApiSchemaProperty({
    description: 'Title for the reward or campaign',
    writeOnly: true,
  })
  @readable(String)
  title!: string

  @OpenApiSchemaProperty({
    description: 'Description of the reward',
    writeOnly: true,
  })
  @readable(String)
  description!: string

  @OpenApiSchemaProperty({
    description: 'UID of the user receiving a reward',
    writeOnly: true,
  })
  @readable(String)
  user!: string

  @OpenApiSchemaProperty({
    description: 'Amount in USDC',
    writeOnly: true,
  })
  @readable(Number)
  amountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Identifier of the agent who created the reward',
    writeOnly: true,
  })
  @readable(String)
  createdBy!: string
}
