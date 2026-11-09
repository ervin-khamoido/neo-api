2023

import { CardOrderType } from '../card-order.model'
import { ActivityType } from './activity.model'

export interface ICardOrderFundDetails {
  type: ActivityType.Card
  orderType: CardOrderType.Fund
  card: string
  cardNumber: string
  fee: number
  feeFormatted: string
}

export interface ICardOrderUnloadDetails {
  type: ActivityType.Card
  orderType: CardOrderType.Unload
  card: string
  cardNumber: string
}

export interface ICardOrderSpendDetails {
  type: ActivityType.Card
  orderType: CardOrderType.Spend
  card: string
  cardNumber: string
  providerDescription: string | null
  fee: number
  feeFormatted: string
}

export interface ICardOrderReversalDetails {
  type: ActivityType.Card
  orderType: CardOrderType.Reversal
  card: string
  cardNumber: string
}

export interface ICardOrderFeeDetails {
  type: ActivityType.Card
  orderType: CardOrderType.Fee
  card: string
  cardNumber: string
}

export type ICardOrderDetails =
  | ICardOrderFundDetails
  | ICardOrderUnloadDetails
  | ICardOrderSpendDetails
  | ICardOrderReversalDetails
  | ICardOrderFeeDetails
