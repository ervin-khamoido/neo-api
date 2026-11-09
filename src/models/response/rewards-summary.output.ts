2023

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { CurrencyType } from '../db'

@OpenApiSchema({
  description: 'Reward totals output model',
})
export class RewardTotalsOutput {
  @OpenApiSchemaProperty({
    description: 'Total earned - all time',
    readOnly: true,
  })
  @readable
  totalEarned!: number

  @OpenApiSchemaProperty({
    description: 'Total earned - current month',
    readOnly: true,
  })
  @readable
  totalEarnedCurrentMonth!: number

  @OpenApiSchemaProperty({
    description: 'Currency type',
    readOnly: true,
  })
  @readable
  currency!: CurrencyType

  @OpenApiSchemaProperty({
    description: 'Current month',
    readOnly: true,
  })
  @readable
  currentMonth!: string
}

@OpenApiSchema({
  description: 'Rewards summary output model',
})
export class RewardsSummaryOutput {
  @OpenApiSchemaProperty({
    description: 'The reward totals info info for yield',
    type: OpenApiDataType.object,
    readOnly: true,
  })
  @readable(RewardTotalsOutput)
  yieldTotals!: RewardTotalsOutput

  @OpenApiSchemaProperty({
    description: 'The reward totals info for cashback buy',
    type: OpenApiDataType.object,
    readOnly: true,
  })
  @readable(RewardTotalsOutput)
  cashbackBuyTotals!: RewardTotalsOutput

  @OpenApiSchemaProperty({
    description: 'The reward totals info for referrals',
    type: OpenApiDataType.object,
    readOnly: true,
  })
  @readable(RewardTotalsOutput)
  referralTotals!: RewardTotalsOutput

  @OpenApiSchemaProperty({
    description: 'The reward totals info for promotion campaigns',
    type: OpenApiDataType.object,
    readOnly: true,
  })
  @readable(RewardTotalsOutput)
  promotionCampaignTotals!: RewardTotalsOutput
}
