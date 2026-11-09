import { IReferralRewardDetails, IUserReferrerRejectedRewardDetails, UserModel } from '../../../models/db'

export type ConditionCheckResult =
  | {
      satisfies: true
      details: IReferralRewardDetails
    }
  | {
      satisfies: false
      rejected: false
    }
  | {
      satisfies: false
      rejected: true
      rejectedDetails: IUserReferrerRejectedRewardDetails
    }

export interface IReferralCondition<TDetails> {
  check(referrer: UserModel, referee: UserModel, details: TDetails): Promise<ConditionCheckResult>
}

export type ReferralConditionFactory = <TDetails>(version: string) => IReferralCondition<TDetails> | null

export const ReferralConditionFactorySymbol = Symbol.for('ReferralConditionFactory')
