2021

import { inject, injectable, named } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { Queue } from 'bullmq'

import { UserReferrerPayoutEntityServiceSymbol, IUserReferrerPayoutEntityService } from '../../models/db'
import { RedisConfig, RedisConfigSymbol } from '../../lib/models/config'
import { EventQueueSymbol } from '../../utils/event-queue'

import { ReferrerRewardEvent, ReferrerRewardQueueV1 } from '../../microservice/referral-reward/common'
import { PayoutReferrerRewardData } from '../../microservice/referral-reward/model/payout-referrer-reward.data'

import { IUserReferrerService, UserReferrerServiceSymbol } from './user-referrer.service'

export interface IUserReferrerPayoutService {
  createDeferredPayout(referrerId: number, refereeId: number): Promise<boolean>
  schedulePayoutReward(refereeId: number): Promise<void>
}

export const UserReferrerPayoutServiceSymbol = Symbol.for('IUserReferrerPayoutService')

@injectable()
export class UserReferrerPayoutService implements IUserReferrerPayoutService {
  @inject(RedisConfigSymbol) redisConfig!: RedisConfig
  @inject(UserReferrerPayoutEntityServiceSymbol) userReferrerPayoutEntityService!: IUserReferrerPayoutEntityService
  @inject(UserReferrerServiceSymbol) userReferrerService!: IUserReferrerService

  @inject(EventQueueSymbol) @named(ReferrerRewardQueueV1) queue!: Queue<PayoutReferrerRewardData>

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserReferrerPayoutService)
  }

  async createDeferredPayout(referrerId: number, refereeId: number): Promise<boolean> {
    const result = await this.userReferrerService.getReferrerPayoutAndDetails(referrerId)

    // gracefully handle the error
    if (!result) {
      this.logger.error(
        `Deferred Payout is not created for ${referrerId} ${refereeId} because getReferrerPayoutAndDetails returned null`,
      )
      return false
    }

    const [amount, details] = result

    // deferred payment is not created if amount is less than a penny
    const amountThreshold = 0.01
    if (amount < amountThreshold) {
      this.logger.error(
        `Deferred Payout is not created for ${referrerId} ${refereeId} because amount < ${amountThreshold}`,
      )
      return false
    }

    await this.userReferrerPayoutEntityService.addOne({
      referrerId,
      refereeId,
      rewardOrderId: null,
      details: details,
      rejectedRewardDetails: null,
      amount,
    })

    return true
  }

  async schedulePayoutReward(refereeId: number): Promise<void> {
    try {
      await this.queue.add(ReferrerRewardEvent.PayoutReferrerReward, { refereeId })
      this.logger.info(`scheduled payout reward for refereeId: ${refereeId}`)
    } catch (err: any) {
      // swallow the error
      this.logger.error(`critical: could not put a referral reward payout event in the queue`)
      this.logger.error(err)
    }
  }
}
