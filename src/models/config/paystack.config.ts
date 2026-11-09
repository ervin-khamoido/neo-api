2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IPaystackConfig {
  readonly url: string
  readonly key: string
}

export const PaystackConfigSymbol = Symbol.for('IPaystackConfig')

@injectable()
export class PaystackConfig implements IPaystackConfig {
  readonly url: string
  readonly key: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    this.url = config.get('paystack.url')
    this.key = config.get('paystack.key')

    if (!this.url || !this.key) {
      throw new ConfigError('paystack configuration is missing')
    }
  }
}
