2021

import { RewardOrderModel, RewardType, UserModel } from '../db'

export interface ICreateRewardOrderInput {
  user: UserModel
  rewardType: RewardType
  title: string
  amountUsdc: number
  description?: string | null
  details: RewardOrderModel['details']
}
