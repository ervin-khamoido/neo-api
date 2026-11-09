import { RewardType } from '../../../models/db'
import { interfaces } from 'inversify'
import { CampaignRewardNotificationService } from './campaign-reward-notification.service'
import { IRewardNotificationService } from './reward-notification.service'

export const RewardNotificationFactorySymbol = Symbol.for('RewardNotificationFactory')

export const createRewardNotificationFactory: FactoryCreator = ({ container }) => rewardType => {
  switch (rewardType) {
    case RewardType.Promotion_Campaign:
      return container.resolve<IRewardNotificationService>(CampaignRewardNotificationService)

    // TODO: move notification logic from reward-order.service here for other types of rewards
    default:
      return null
  }
}

export type RewardNotificationFactory = (rewardType: RewardType) => IRewardNotificationService | null
type FactoryCreator = (context: { container: interfaces.Container }) => RewardNotificationFactory
