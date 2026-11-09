2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IPhoneConfig {
  readonly phoneOtpAllToWhatsapp: boolean
}

export const PhoneConfigSymbol = Symbol.for('IPhoneConfig')

@injectable()
export class PhoneConfig implements IPhoneConfig {
  readonly phoneOtpAllToWhatsapp: boolean

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('phone')) {
      throw new ConfigError('Phone configuration is missing')
    }

    this.phoneOtpAllToWhatsapp = config.get('phone.phoneOtpAllToWhatsapp') === 'true'
  }
}
