import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IReferralConfig {
  readonly prettyLinkHost: string
}

export const ReferralConfigSymbol = Symbol.for('IReferralConfig')

@injectable()
export class ReferralConfig implements IReferralConfig {
  readonly prettyLinkHost: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('referral')) {
      throw new ConfigError('referral configuration is missing')
    }

    this.prettyLinkHost = config.get('referral.prettyLinkHost')
  }
}
