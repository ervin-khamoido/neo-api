2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigSymbol } from '@ts-awesome/logger'

export interface IPhoneListConfig {
  readonly white: string[] | null
  readonly black: string[] | null
}

export const PhoneListConfigSymbol = Symbol.for('IPhoneListConfig')

@injectable()
export class PhoneListConfig implements IPhoneListConfig {
  readonly white: string[] | null
  readonly black: string[] | null

  constructor(@inject(ConfigSymbol) config: IConfig) {
    const white = config.get<string | null>('phoneList.white')
    const black = config.get<string | null>('phoneList.black')

    this.white = white == null ? null : JSON.parse(white)
    this.black = black == null ? null : JSON.parse(black)
  }
}
