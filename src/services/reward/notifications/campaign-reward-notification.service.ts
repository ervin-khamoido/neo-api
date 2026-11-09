import { inject, injectable } from 'inversify'
import {
  IOrderEntityService,
  IPromotionCampaignDetails,
  IRewardOrderEntityService,
  IUserEntityService,
  OrderEntityServiceSymbol,
  OrderModel,
  PromotionCampaignType,
  RewardOrderEntityServiceSymbol,
  RewardOrderModel,
  RewardType,
  UserEntityServiceSymbol,
  UserModel,
} from '../../../models/db'
import { ConfigSymbol, ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { formatUsdcForNotifications, NGN, PERCENTAGE, USDC } from '../../../utils/formatter'
import { MailTemplates } from '../../mailer/mailgun.service'
import { IMailerService, MailerServiceSymbol } from '../../../lib/services/mailer'
import { IPushService, PushServiceSymbol } from '../../push.service'
import { IConfig } from 'config'
import { IRewardNotificationService } from './reward-notification.service'

@injectable()
export class CampaignRewardNotificationService implements IRewardNotificationService {
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(RewardOrderEntityServiceSymbol) rewardOrderEntityService!: IRewardOrderEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(PushServiceSymbol) pushService!: IPushService
  @inject(ConfigSymbol) config!: IConfig

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(CampaignRewardNotificationService)
  }

  async notifyViaEmail(rewardOrderId: number): Promise<void> {
    const [order, rewardOrder] = await Promise.all([
      this.orderEntityService.getOne({ id: rewardOrderId }),
      this.rewardOrderEntityService.getOne({ orderId: rewardOrderId }),
    ])
    if (!order || !rewardOrder) {
      this.logger.error(`critical: reward order with id ${rewardOrderId} is not found`)
      return
    }

    if (rewardOrder.rewardType !== RewardType.Promotion_Campaign) {
      throw new Error(`unexpected: reward order has an invalid type: ${rewardOrder.rewardType}`)
    }

    const user = await this.userEntityService.getOne({ id: order.userId })
    if (!user) {
      throw new Error(`critical: user with id ${order.userId} is not found`)
    }

    const neobankAppLink = this.config.get<string>('deepLinkHome')
    const { amount, amountUsdc, details } = rewardOrder
    const { campaignType } = details as IPromotionCampaignDetails
    const campaignName = CampaignTypeToName[campaignType] ?? DefaultCampaignName

    await this.mailerService.send({
      subject: `🎉 Yay! You just won ${USDC(amountUsdc, false)} in ${campaignName}!`,
      to: user.email,
      template: {
        name: MailTemplates.PromotionCampaignDefault,
        variables: {
          campaign_amount_usdc: USDC(amountUsdc, false),
          campaign_amount: NGN(amount, false),
          campaign_name: campaignName,
          neobank_app_link: neobankAppLink,
        },
        conditionalContent: {},
      },
    })
  }

  async notifyViaPush(rewardOrderId: number): Promise<void> {
    const [order, rewardOrder, user] = await this.getRequiredData(rewardOrderId)

    const { amount, amountUsdc, details } = rewardOrder
    const { campaignType } = details as IPromotionCampaignDetails
    const campaignName = CampaignTypeToName[campaignType] ?? DefaultCampaignName

    await this.pushService.scheduleSend({
      userId: user.id,
      reason: 'reward_order:promotion_campaign:completed',
      showOnForeground: true,
      payload: {
        version: 'v1',
        title: `You just won ${USDC(amountUsdc, false)} in ${campaignName}!`,
        body:
          `Congratulations! You just won ${USDC(amountUsdc, false)} (${NGN(amount, false)}) in ${campaignName}. ` +
          `This has been credited to your Neobank wallet. Keep participating to keep winning!`,
      },
      data: {
        type: 'order.reward',
        version: 'v1',
        order: order.uid,
      },
    })
  }

  private async getRequiredData(rewardOrderId: number): Promise<RequiredInfoTuple> {
    const [order, rewardOrder] = await Promise.all([
      this.orderEntityService.getOne({ id: rewardOrderId }),
      this.rewardOrderEntityService.getOne({ orderId: rewardOrderId }),
    ])
    if (!order || !rewardOrder) {
      throw new Error(`critical: reward order with id ${rewardOrderId} is not found`)
    }

    if (rewardOrder.rewardType !== RewardType.Promotion_Campaign) {
      throw new Error(`unexpected: reward order has an invalid type: ${rewardOrder.rewardType}`)
    }

    const user = await this.userEntityService.getOne({ id: order.userId })
    if (!user) {
      throw new Error(`critical: user with id ${order.userId} is not found`)
    }

    return [order, rewardOrder, user]
  }
}

type RequiredInfoTuple = [OrderModel, RewardOrderModel, UserModel]

const CampaignTypeToName: Record<PromotionCampaignType, string> = {
  [PromotionCampaignType.NeobankAppSaturday]: 'Neobank App Saturday',
}

const DefaultCampaignName = 'Neobank Campaign'
