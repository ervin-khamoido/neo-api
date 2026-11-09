2023

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  IPromotionCampaignEntityService,
  PromotionCampaignEntityServiceSymbol,
  PromotionCampaignModel,
} from '../models/db'
import { ICreatePromotionCampaignInput } from '../models/promotion-campaign'

export interface IPromotionCampaignService {
  getPromotionCampaignByTag(tag: string): Promise<PromotionCampaignModel | null>
  getOrCreatePromotionCampaign(payload: ICreatePromotionCampaignInput): Promise<PromotionCampaignModel>
}

export const PromotionCampaignServiceSymbol = Symbol.for('IPromotionCampaignService')

@injectable()
export class PromotionCampaignService implements IPromotionCampaignService {
  @inject(PromotionCampaignEntityServiceSymbol) promotionCampaignEntityService!: IPromotionCampaignEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(PromotionCampaignService)
  }

  async getPromotionCampaignByTag(tag: string): Promise<PromotionCampaignModel | null> {
    const promotionCampaign = await this.promotionCampaignEntityService.getOne({ tag })

    return promotionCampaign
  }

  async getOrCreatePromotionCampaign(payload: ICreatePromotionCampaignInput): Promise<PromotionCampaignModel> {
    let promotionCampaign = await this.promotionCampaignEntityService.getOne({ tag: payload.tag })

    if (!promotionCampaign) {
      this.logger.info(`Promotion campaign with tag ${payload.tag} does not exist, creating entity`)

      promotionCampaign = await this.promotionCampaignEntityService.addOne(payload)
    }

    return promotionCampaign
  }
}
