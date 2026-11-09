2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_JSON, DB_UID } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'
import { RewardType } from '../reward-order.model'
import { ICardOrderDetails } from './co-activity-details'
import { IOnChainOrderDetails } from './oco-activity-details'

export enum TransactionMode {
  BankTransfer = 'bank_transfer',
  USSD = 'ussd',
}

export enum ActivityType {
  Buy = 'Buy',
  Sell = 'Sell',
  Yield = 'Yield',
  Reward = 'Reward',

  Transfer_Send = 'Transfer_Send',
  Transfer_Receive = 'Transfer_Receive',

  Card = 'card',

  OnChain = 'OnChain',
}

export interface IPurchaseOrderDetails {
  type: ActivityType.Buy
  transactionMode: TransactionMode
  userBankAccountNumber: string
  amount: number
  exchangeRate: number
  fee: number
}

export interface ISellOrderDetails {
  type: ActivityType.Sell
  userBankAccountNumber: string
  amount: number
  amountUsdc: number
  exchangeRate: number
  fee: number
}

export interface IYieldOrderPeriod {
  start: Date
  end: Date
}

export interface IYieldOrderDetails {
  type: ActivityType.Yield
  subType: string
  period: IYieldOrderPeriod
  month: number
  yieldMonth: number
  credited: Date
  averageInterestRate?: number | null
}

export type IActivityRewardDetails =
  | IRewardOrderCashbackActivityDetails
  | IRewardOrderReferralActivityDetails
  | IRewardOrderPromotionCampaignActivityDetails

export interface IRewardOrderCashbackActivityDetails {
  rewardType: RewardType.Cashback_Buy
  version: 'v1'
  percentage: number
  totalUsdc: number
  amount: number
  cashbackUsdc: number
}

export interface IRewardOrderReferralActivityDetails {
  rewardType: RewardType.Referral_Referrer
  version: 'v1'
  referrerPayoutsCount: number
}

export interface IRewardOrderPromotionCampaignActivityDetails {
  rewardType: RewardType.Promotion_Campaign
  version: 'v1'
}

export interface IRewardOrderDetails {
  type: ActivityType.Reward
  rewardType: RewardType

  // REFACTOR: move to parent model
  title: string
  description?: string | null

  credited: Date
  exchangeRate: number
  details: IActivityRewardDetails | null
}

// Transfer Order Details
interface ITransferCommonDetails {
  title: string
  description?: string | null
}

export interface ITransferSendDetails extends ITransferCommonDetails {
  type: ActivityType.Transfer_Send
  receiver: string // User UID
  receiverUsername: string
  receiverDisplayName: string
}

export interface ITransferReceiveDetails extends ITransferCommonDetails {
  type: ActivityType.Transfer_Receive
  sender: string // User UID
  senderUsername: string
  senderDisplayName: string
}

export type ITransferOrderDetails = ITransferSendDetails | ITransferReceiveDetails

@dbTable('activity')
export class ActivityModel {
  @dbField({ autoIncrement: true, primaryKey: true })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ nullable: true, model: String })
  comment!: string | null

  @dbField
  type!: ActivityType

  @dbField('order_id')
  orderId!: number

  @dbField('user_id')
  userId!: number

  @dbField('order_reference_number')
  orderReferenceNumber!: string

  @dbField('amount_usdc')
  amountUsdc!: number

  @dbField
  amount!: number

  @dbField({ kind: DB_JSON, model: Object })
  details!:
    | IPurchaseOrderDetails
    | ISellOrderDetails
    | IYieldOrderDetails
    | IRewardOrderDetails
    | ITransferOrderDetails
    | ICardOrderDetails
    | IOnChainOrderDetails

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const ActivityEntityServiceSymbol = Symbols.serviceFor(ActivityModel)

export interface IActivityEntityService
  extends IEntityService<ActivityModel, 'id', 'id' | 'uid' | 'createdAt' | 'updatedAt', never> {}
