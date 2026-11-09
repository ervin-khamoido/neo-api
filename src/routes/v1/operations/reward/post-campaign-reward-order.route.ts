2023

import { inject } from 'inversify'

import { ForbiddenError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'
import { UnitOfWorkSymbol, IUnitOfWork } from '@ts-awesome/entity'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import { NotFoundError } from '../../../../errors'
import validation from '../../../../lib/utils/validation'

import { AppConfigSymbol, IAppConfig, OperationsAudience } from '../../../../models/config'
import {
  IUserEntityService,
  UserEntityServiceSymbol,
  RewardType,
  RewardOrderModel,
  OrderModel,
} from '../../../../models/db'
import { AddressInput, PromotionCampaignRewardInput } from '../../../../models/request'
import { PostEntityOutput } from '../../../../models/response'

import { OperationsAccessMiddlewareFactory } from '../../../../middleware/access/operations-access.middleware'

import { IRewardOrderService, RewardOrderServiceSymbol } from '../../../../services/reward/reward-order.service'
import {
  IPromotionCampaignService,
  PromotionCampaignServiceSymbol,
} from '../../../../services/promotion-campaign.service'
import { MIN_REWARD_AMOUNT_USDC } from '../../../../common/constants'

@httpPost(
  '/api/v1/operations/reward/promotion-campaign',
  OperationsAccessMiddlewareFactory({ audience: OperationsAudience.Retool }),
)
export class PostCampaignRewardOrderRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(AppConfigSymbol) appConfig!: IAppConfig

  @inject(validation.symbolFor(AddressInput)) addressValidator!: IValidator<AddressInput>

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  @inject(PromotionCampaignServiceSymbol) promotionCampaignService!: IPromotionCampaignService
  @inject(RewardOrderServiceSymbol) rewardOrderService!: IRewardOrderService

  private readonly logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostCampaignRewardOrderRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/operations/reward/promotion-campaign',
    description: `Post create a reward order to credit a user account for a promotional campaign`,
    summary: `POST create a reward order to credit a user account for a promotional campaign`,
    security: [{ OperationsToken: [] }],
    request: {
      body: {
        required: true,
        schema: PromotionCampaignRewardInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Successfully created the reward order', content: PostEntityOutput },
      [StatusCode.BadRequest]: { description: 'Invalid request' },
      [StatusCode.Forbidden]: { description: 'Amount entered exceeded the max reward amount' },
      [StatusCode.NotFound]: { description: 'User not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(PromotionCampaignRewardInput) body: PromotionCampaignRewardInput): Promise<void> {
    await this.verifyRewardLimit(body.amountUsdc, body.createdBy)

    const [order, rewardOrder] = await this.uow.auto(() => this.createCampaignReward(body))

    return this.json(order, StatusCode.Created, PostEntityOutput)
  }

  private async verifyRewardLimit(amountUsdc: number, createdBy: string) {
    if (amountUsdc < MIN_REWARD_AMOUNT_USDC) {
      this.logger.error(
        `Amount entered is less than the minimum allowed reward amount. 
        Amount entered: ${amountUsdc}. 
        Min amount: ${MIN_REWARD_AMOUNT_USDC}. 
        Requested by: ${createdBy}.`,
      )

      throw new ForbiddenError(`The amount entered is less than the minimum allowed reward amount.`)
    }

    if (amountUsdc > this.appConfig.maxRewardAmountUsdc) {
      this.logger.error(
        `Amount entered exceeded the max reward limit. 
        Amount entered: ${amountUsdc}. 
        Max amount: ${this.appConfig.maxRewardAmountUsdc}. 
        Requested by: ${createdBy}.`,
      )

      throw new ForbiddenError(`The amount entered exceeded the maximum allowed reward amount.`)
    }
  }

  private async createCampaignReward(body: PromotionCampaignRewardInput): Promise<[OrderModel, RewardOrderModel]> {
    const user = await this.userEntityService.getOne({ uid: body.user })
    if (!user) {
      this.logger.error(`critical: User [${body.user}] not found`)
      throw new NotFoundError(`Customer not found.`)
    }

    const createdBy = `appsmith:${body.createdBy}`
    const campaign = await this.promotionCampaignService.getOrCreatePromotionCampaign({
      tag: body.campaignTag,
      type: body.campaignType,
      createdBy: createdBy,
    })

    const result = await this.rewardOrderService.createRewardOrder({
      user: user,
      amountUsdc: body.amountUsdc,
      rewardType: RewardType.Promotion_Campaign,
      title: body.title,
      description: body.description,
      details: {
        type: RewardType.Promotion_Campaign,
        version: 'v1',
        createdBy: body.createdBy,
        campaignTag: campaign.tag,
        campaignType: campaign.type,
        campaignCreatedBy: campaign.createdBy,
      },
    })

    return result
  }
}
