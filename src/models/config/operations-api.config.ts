2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export enum OperationsAudience {
  YieldProcessor = 'yield_processor',
  Retool = 'retool',
  Dashboard = 'dashboard',
}

type AudienceKey = {
  audience: OperationsAudience
  key: string
}

export interface IOperationsApiConfig {
  readonly audienceKeys: AudienceKey[]
}

export const OperationsApiConfigSymbol = Symbol.for('IOperationsApiConfig')

@injectable()
export class OperationsApiConfig implements IOperationsApiConfig {
  readonly audienceKeys: AudienceKey[]

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('operationsApi')) {
      throw new ConfigError('operationsApi configuration is missing')
    }

    this.audienceKeys = [
      { audience: OperationsAudience.YieldProcessor, key: config.get<string>('operationsApi.yieldKey') },
      { audience: OperationsAudience.Retool, key: config.get<string>('operationsApi.retoolKey') },
    ]
  }
}
