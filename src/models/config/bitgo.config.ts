2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IBitGoConfig {
  readonly apiUrl: string
  readonly allowProxySelfSigned: boolean
  readonly apiToken: string
  readonly inOutWalletId: string
  readonly floatWalletId: string
  readonly quarantineWalletId: string
  readonly baseCoin: string
  readonly usdcCoin: string
  readonly inOutWalletEncryptedPRV: string
  readonly inOutWalletPassphrase: string
  readonly accessToken: string
}

export const BitGoConfigSymbol = Symbol.for('IBitGoConfig')

@injectable()
export class BitGoConfig implements IBitGoConfig {
  readonly apiUrl: string
  readonly allowProxySelfSigned: boolean
  readonly apiToken: string
  readonly inOutWalletId: string
  readonly floatWalletId: string
  readonly quarantineWalletId: string
  readonly baseCoin: string
  readonly usdcCoin: string
  readonly inOutWalletEncryptedPRV: string
  readonly inOutWalletPassphrase: string
  readonly accessToken: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('bitgo')) {
      throw new ConfigError('bitgo configuration is missing')
    }

    this.apiUrl = config.get('bitgo.apiUrl')
    this.allowProxySelfSigned = config.get<string>('bitgo.allowProxySelfSigned') === 'true' ? true : false
    this.apiToken = config.get('bitgo.apiToken')
    this.inOutWalletId = config.get('bitgo.inOutWalletId')
    this.floatWalletId = config.get('bitgo.floatWalletId')
    this.quarantineWalletId = config.get('bitgo.quarantineWalletId')
    this.baseCoin = config.get('bitgo.baseCoin')
    this.usdcCoin = config.get('bitgo.usdcCoin')
    this.inOutWalletEncryptedPRV = config.get('bitgo.inOutWalletEncryptedPRV')
    this.inOutWalletPassphrase = config.get('bitgo.inOutWalletPassphrase')
    this.accessToken = config.get('bitgo.accessToken')
  }
}
