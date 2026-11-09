import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface ITwilioConfig {
  readonly accountSid: string
  readonly authToken: string
  readonly phone: string
  readonly whatsappPhone: string
}

export const TwilioConfigSymbol = Symbol.for('ITwilioConfig')

@injectable()
export class TwilioConfig implements ITwilioConfig {
  readonly accountSid!: string
  readonly authToken!: string
  readonly phone!: string
  readonly whatsappPhone!: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('twilio')) {
      throw new ConfigError('twilio configuration is missing')
    }

    this.accountSid = config.get('twilio.accountSid')
    this.authToken = config.get('twilio.authToken')
    this.phone = config.get('twilio.phone')
    this.whatsappPhone = config.get('twilio.whatsappPhone')
  }
}
