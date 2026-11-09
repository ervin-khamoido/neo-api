2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IModernTreasuryConfig {
  readonly url: string
  readonly organizationId: string
  readonly key: string
  readonly ledgerId: string
}

export const ModernTreasuryConfigSymbol = Symbol.for('IModernTreasuryConfig')

@injectable()
export class ModernTreasuryConfig implements IModernTreasuryConfig {
  readonly url: string
  readonly organizationId: string
  readonly key: string
  readonly ledgerId: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('modernTreasury')) {
      throw new ConfigError('modernTreasury configuration is missing')
    }

    this.url = config.get('modernTreasury.url')
    this.organizationId = config.get('modernTreasury.organizationId')
    this.key = config.get('modernTreasury.key')
    this.ledgerId = config.get('modernTreasury.ledgerId')
  }
}
