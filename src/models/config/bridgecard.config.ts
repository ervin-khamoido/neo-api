2023

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'
import { CardBrand, CardType } from '../bridgecard'

export interface IBridgeCardConfig {
  readonly apiUrl: string
  readonly apiAuthToken: string
  readonly apiVaultUrl: string
  readonly apiForwardedForKey: string
  readonly apiSecretKey: string
  readonly apiWebhookSecretKey: string

  readonly cardConfig: CardConfig
  readonly useBVNVerification: boolean
}

export const BridgeCardConfigSymbol = Symbol.for('IBridgeCardConfig')

@injectable()
export class BridgeCardConfig implements IBridgeCardConfig {
  readonly apiUrl: string
  readonly apiAuthToken: string
  readonly apiVaultUrl: string
  readonly apiForwardedForKey: string
  readonly apiSecretKey: string
  readonly apiWebhookSecretKey: string

  readonly cardConfig: CardConfig
  readonly useBVNVerification: boolean

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('bridgecard')) {
      throw new ConfigError('bridgecard configuration is missing')
    }

    this.apiUrl = config.get('bridgecard.apiUrl')
    this.apiAuthToken = config.get('bridgecard.apiAuthToken')
    this.apiVaultUrl = config.get('bridgecard.apiVaultUrl')
    this.apiForwardedForKey = config.get('bridgecard.apiForwardedForKey')
    this.apiSecretKey = config.get('bridgecard.apiSecretKey')
    this.apiWebhookSecretKey = config.get('bridgecard.apiWebhookSecretKey')

    this.cardConfig = JSON.parse(config.get<string>('bridgecard.cardConfig'))
    this.useBVNVerification = config.get('bridgecard.useBVNVerification') === 'true'
  }
}

export interface IVisaConfig {
  brand: CardBrand.Visa

  creationFee: number
  maintenanceFee: number // monthly
  debitFee: number
  creditFee: number
  minFundAmount: number
  maxFundAmount: number
  minUnloadAmount: number
  maxUnloadAmount: number

  // only for typing
  initialFundAmount?: never
}

export interface IMastercardConfig {
  brand: CardBrand.Mastercard

  creationFee: number
  initialFundAmount: number
  minFundAmount: number
  maxFundAmount: number
  minUnloadAmount: number
  maxUnloadAmount: number

  // only for typing
  maintenanceFee?: never // monthly
  debitFee?: never
  creditFee?: never
}

type CardConfig = IVisaConfig | IMastercardConfig
