2023

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

import { RewardType, UserModel } from '../../../../models/db'
import { RewardsSummaryOutput } from '../../../../models/response'
import { IRewardOrderService, RewardOrderServiceSymbol } from '../../../../services/reward/reward-order.service'
import { IYieldOrderService, YieldOrderServiceSymbol } from '../../../../services/yield-order.service'

@httpGet('/api/v1/user/rewards/summary', FireAccessMiddleware(), PinAccessMiddleware)
export class GetUserRewardsSummary extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(RewardOrderServiceSymbol) rewardOrderService!: IRewardOrderService
  @inject(YieldOrderServiceSymbol) yieldOrderService!: IYieldOrderService

  @OpenApiOperationGet({
    path: '/api/v1/user/rewards/summary',
    description: 'Gets the summaries for all reward types',
    summary: 'GET the summaries for all reward types',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Rewards Summary Info', content: RewardsSummaryOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const rewardsSummary = await this.getRewardsSummary()

    return this.json(rewardsSummary, RewardsSummaryOutput)
  }

  private async getRewardsSummary(): Promise<RewardsSummaryOutput> {
    const referralTotals = await this.rewardOrderService.getTotalsEarnedByRewardType(
      this.user.id,
      RewardType.Referral_Referrer,
    )
    const cashbackBuyTotals = await this.rewardOrderService.getTotalsEarnedByRewardType(
      this.user.id,
      RewardType.Cashback_Buy,
    )
    const promotionCampaignTotals = await this.rewardOrderService.getTotalsEarnedByRewardType(
      this.user.id,
      RewardType.Promotion_Campaign,
    )
    const yieldTotals = await this.yieldOrderService.getYieldTotalsEarned(this.user)

    return {
      referralTotals,
      cashbackBuyTotals,
      promotionCampaignTotals,
      yieldTotals,
    }
  }
}
