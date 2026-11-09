import { inject, injectable } from 'inversify'
import { Job, Worker } from 'bullmq'
import { ILogger, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'
import read from '@ts-awesome/model-reader'

import { IRedisConfig, RedisConfigSymbol } from '../../lib/models/config'
import { ReferrerRewardQueueV1 } from './common'

import { PayoutReferrerRewardData } from './model/payout-referrer-reward.data'
import {
  IOrderEntityService,
  IPurchaseOrderEntityService,
  IReferralRewardDetails,
  IUserEntityService,
  IUserReferrerPayoutEntityService,
  OrderEntityServiceSymbol,
  PurchaseOrderEntityServiceSymbol,
  RewardType,
  UserEntityServiceSymbol,
  UserModel,
  UserReferrerPayoutEntityServiceSymbol,
  UserReferrerPayoutModel,
} from '../../models/db'
import { IRewardOrderService, RewardOrderServiceSymbol } from '../../services/reward/reward-order.service'
import currency from 'currency.js'
import { ExchangeRateServiceSymbol, IExchangeRateService } from '../../services/exchange-rate.service'
import { ReferralConditionFactory, ReferralConditionFactorySymbol } from './conditions/referral-condition'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { IUserStatusService, UserStatusServiceSymbol } from '../../services/user-status.service'

export interface IReferralRewardService {
  start(): Promise<void>
  stop(): Promise<void>
}

@injectable()
export class ReferralRewardService implements IReferralRewardService {
  private logger: ILogger
  private worker: Worker | null = null

  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(RedisConfigSymbol) redisConfig!: IRedisConfig
  @inject(UserReferrerPayoutEntityServiceSymbol) userReferrerPayoutEntityService!: IUserReferrerPayoutEntityService

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserStatusServiceSymbol) userStatusService!: IUserStatusService

  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(PurchaseOrderEntityServiceSymbol) purchaseOrderEntityService!: IPurchaseOrderEntityService

  @inject(ExchangeRateServiceSymbol) exchangeRateService!: IExchangeRateService
  @inject(RewardOrderServiceSymbol) rewardOrderService!: IRewardOrderService

  @inject(ReferralConditionFactorySymbol) referralConditionFactory!: ReferralConditionFactory

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    const loggerName = `${ReferralRewardService.name}|${process.pid}`
    this.logger = loggerFactory(loggerName)
  }

  start(): Promise<void> {
    this.worker = new Worker<PayoutReferrerRewardData>(ReferrerRewardQueueV1, job => this.onJob(job), {
      connection: this.redisConfig,
    })
    this.worker.on('failed', (job, reason) => this.onJobFailure(job, reason))
    this.worker.on('error', reason => this.onJobError(reason))

    this.logger.info(`start worker. Worker ID = ${this.worker.id}`)

    return Promise.resolve(undefined)
  }

  async stop(): Promise<void> {
    this.logger.info(`stop worker. Worker ID = ${this.worker?.id}`)

    await this.worker?.close(true)
    this.worker = null
  }

  async onJob(job: Job<PayoutReferrerRewardData>) {
    this.logger.info(`start job. name: ${job.name}. data: ${JSON.stringify(job.data)}`)

    let jobData: PayoutReferrerRewardData | null
    try {
      jobData = read(job.data, PayoutReferrerRewardData)
    } catch (err: any) {
      this.logger.warn(`stop job. reason: ${err}`)
      this.logger.error(err)
      return
    }

    if (!jobData) {
      this.logger.warn(`stop job. reason: read() returned null`)
      return
    }

    await this.uow.auto(() => this.doJob(jobData!))
  }

  async onJobFailure(job: Job, err: Error): Promise<void> {
    this.logger.error(err)
  }

  async onJobError(err: Error): Promise<void> {
    this.logger.error(err)
  }

  private async doJob(jobData: PayoutReferrerRewardData) {
    const { refereeId } = jobData

    // acquire update lock on the row
    this.logger.info(`before acquiring a lock on user_referrer_payout row. refereeId=${refereeId}`)
    const userReferrerPayout = await this.userReferrerPayoutEntityService.getPendingPayoutForUpdate(refereeId)
    if (!userReferrerPayout) {
      this.logger.warn(`stop job. reason: userReferrerPayout is not found or it has already been paid out`)
      return
    }
    this.logger.info(`after acquiring a lock on user_referrer_payout row. refereeId=${refereeId}`)

    if (userReferrerPayout.rewardOrderId || userReferrerPayout.rejectedRewardDetails) {
      this.logger.error('stop job. reason: rewardOrderId or rejectedRewardDetails is set but expected to be null')
      return
    }

    const [referrer, referrerStatus, referee] = await Promise.all([
      // referrer
      this.userEntityService.getOne({ id: userReferrerPayout.referrerId }),
      this.userStatusService.calculateUserStatus(userReferrerPayout.referrerId),

      // referee
      this.userEntityService.getOne({ id: userReferrerPayout.refereeId }),
    ])

    const isReferrerActive = await this.userStatusService.isActive(referrerStatus)
    if (!isReferrerActive) {
      this.logger.warn(`stop job. reason: referrer is not active user`)
      return
    }

    if (!referrer || !referee) {
      this.logger.warn(`stop job. reason: referrer or referee is not found`)
      return
    }

    const { details } = userReferrerPayout

    const referralConditions = this.referralConditionFactory(details.version)
    if (!referralConditions) {
      this.logger.warn(`stop job. reason: referral conditions are null. details version: ${details.version}`)
      return
    }

    // check conditions
    const checkResult = await referralConditions.check(referrer, referee, details)

    // act
    if (checkResult.satisfies) {
      this.logger.info(`the referral conditions are satisfied. details: ${JSON.stringify(details)}`)
      await this.rewardPayout(referrer, userReferrerPayout, checkResult.details)
      this.logger.info(`end job with a created reward order`)
    } else {
      if (checkResult.rejected) {
        this.logger.info(
          `the referral conditions are not satisfied and payout rejected. reject details: ${JSON.stringify(details)}`,
        )
        await this.userReferrerPayoutEntityService.updateOne({
          id: userReferrerPayout.id,
          rejectedRewardDetails: checkResult.rejectedDetails,
        })
      } else {
        this.logger.info(`the referral conditions are not satisfied yet but not rejected`)
      }
      this.logger.info(`end job without a created reward order`)
    }
  }

  private async rewardPayout(
    referrer: UserModel,
    userReferrerPayout: UserReferrerPayoutModel,
    details: IReferralRewardDetails,
  ) {
    const now = new Date()
    try {
      const effectiveExchangeRate = await this.exchangeRateService.getExchangeRate(now)
      const rewardUsdc = currency(userReferrerPayout.amount, { precision: 6 }).divide(
        effectiveExchangeRate.buyExchangeRate,
      ).value

      const [order] = await this.rewardOrderService.createRewardOrder({
        title: 'Referral Bonus',
        description: 'You just received a referral bonus!',
        rewardType: RewardType.Referral_Referrer,
        user: referrer,
        amountUsdc: rewardUsdc,
        details: details,
      })

      await this.userReferrerPayoutEntityService.updateOne({
        id: userReferrerPayout.id,
        rewardOrderId: order.id,
      })
    } catch (err: any) {
      this.logger.warn(`stop job. reason: failed to pay out the reward. rethrow the exception`)
      throw err
    }
  }
}
