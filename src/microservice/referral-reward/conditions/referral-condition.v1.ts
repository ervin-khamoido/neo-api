import { inject, injectable } from 'inversify'
import currency from 'currency.js'
import { of } from '@ts-awesome/orm'
import { ILogger, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'
import { readable } from '@ts-awesome/model-reader'

import {
  IPurchaseOrderEntityService,
  IUserReferrerPayoutDetailsV1,
  IUserReferrerPayoutEntityService,
  OrderModel,
  OrderStatusModel,
  PurchaseOrderEntityServiceSymbol,
  RewardType,
  UserModel,
  UserReferrerPayoutEntityServiceSymbol,
} from '../../../models/db'
import { completedPOStatuses } from '../../../services/user-order.service'
import { IUserReferrerService, UserReferrerServiceSymbol } from '../../../services/referrals/user-referrer.service'
import { ConditionCheckResult, IReferralCondition } from './referral-condition'

export const ReferralConditionV1Name = 'v1'

@injectable()
export class ReferralConditionV1 implements IReferralCondition<IUserReferrerPayoutDetailsV1> {
  @inject(PurchaseOrderEntityServiceSymbol) purchaseOrderEntityService!: IPurchaseOrderEntityService
  @inject(UserReferrerPayoutEntityServiceSymbol) userReferrerPayoutEntityService!: IUserReferrerPayoutEntityService

  @inject(UserReferrerServiceSymbol) userReferrerService!: IUserReferrerService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(ReferralConditionV1)
  }

  async check(
    referrer: UserModel,
    referee: UserModel,
    details: IUserReferrerPayoutDetailsV1,
  ): Promise<ConditionCheckResult> {
    const maxReferrerPayoutsCount = await this.userReferrerService.getMaxReferrerPayoutsCount(referrer.id)

    const refereePOs = await this.purchaseOrderEntityService
      .select()
      .columns(x => [x.orderId, x.totalUsdc, of(OrderModel, 'referenceNumber')])
      .join(OrderModel, (root, other) => root.orderId.eq(other.id))
      .join(OrderStatusModel, (root, other) => root.orderId.eq(other.orderId))
      .where(() => of(OrderModel, 'userId').eq(referee.id))
      .where(() => of(OrderStatusModel, 'status').in(completedPOStatuses))
      .fetch(PurchaseOrderAmount)
    const refereeAmountSavedUsdc = refereePOs.reduce(
      (res, curr) => res.add(curr.totalUsdc),
      currency(0, { precision: 6 }),
    )

    this.logger.info(`before acquiring a lock on user_referrer_payout rows for referrer=${referrer.id}`)
    const referrerPayouts = await this.userReferrerPayoutEntityService.getAllPayoutForUpdate(referrer.id)
    this.logger.info(`after acquiring a lock on user_referrer_payout rows for referrer=${referrer.id}`)

    const referrerPayoutsCount = referrerPayouts
      .map(x => (x.rewardOrderId === null ? 0 : 1)) // if the reward_order_id column is not null, then the reward is paid out
      .reduce<number>((res, curr) => res + curr, 0) //

    if (refereeAmountSavedUsdc.value < details.minRefereeSaveAmountUsdc) {
      return {
        satisfies: false,
        rejected: false,
      }
    }

    // if maxReferrerPayoutsCount is null then we check the condition
    // ambassadors have this value = null
    if (maxReferrerPayoutsCount && maxReferrerPayoutsCount <= referrerPayoutsCount) {
      return {
        satisfies: false,
        rejected: true,
        rejectedDetails: {
          version: 'v1',
          referrerPayoutsCount: referrerPayoutsCount,
          refereeSavedAmount: refereeAmountSavedUsdc.value,
          maxReferrerPayoutsCount: maxReferrerPayoutsCount,
          orderIds: refereePOs.map(x => x.orderId),
          orderReferenceNumbers: refereePOs.map(x => x.referenceNumber),
          error: 'The referrer reached the max number of payouts for referees',
        },
      }
    }

    return {
      satisfies: true,
      details: {
        type: RewardType.Referral_Referrer,
        version: 'v1',
        referrerPayoutsCount: referrerPayoutsCount,
        refereeSavedAmount: refereeAmountSavedUsdc.value,
        maxReferrerPayoutsCount: maxReferrerPayoutsCount,
        orderIds: refereePOs.map(x => x.orderId),
        orderReferenceNumbers: refereePOs.map(x => x.referenceNumber),
        minRefereeSaveAmountUsdc: details.minRefereeSaveAmountUsdc,
      },

      rejected: false,
    }
  }
}

class PurchaseOrderAmount {
  @readable('order_id', Number) orderId!: number
  @readable('total_usdc', Number) totalUsdc!: number
  @readable('reference_number', String) referenceNumber!: string
}
