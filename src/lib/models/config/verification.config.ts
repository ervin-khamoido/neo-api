import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IVerificationConfig {
  readonly codeLength: number
}

export const VerificationConfigSymbol = Symbol.for('IVerificationConfig')

@injectable()
export class VerificationConfig implements IVerificationConfig {
  readonly codeLength: number = 5

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('verification')) {
      throw new ConfigError('verification configuration is missing: codeLength')
    }

    this.codeLength = config.get<number>('verification.codeLength')
  }
}
