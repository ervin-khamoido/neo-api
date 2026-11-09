2023

import { ActivityType } from './activity.model'
import { OnChainOrderType } from '../on-chain-order.model'
import { IOnChainFeeResult } from '../../on-chain'

export interface IOnChainOrderSendDetails {
  type: ActivityType.OnChain
  orderType: OnChainOrderType.Send

  fromAddress: string
  toAddress: string

  coin: string
  baseCoin: string

  fee: string
  fees: IOnChainFeeResult | null

  totalUsdc: number
}

export interface IOnChainOrderReceiveDetails {
  type: ActivityType.OnChain
  orderType: OnChainOrderType.Receive

  fromAddress: string
  toAddress: string

  coin: string
  baseCoin: string

  fee: string
}

export type IOnChainOrderDetails = IOnChainOrderSendDetails | IOnChainOrderReceiveDetails
