2021

import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IDashboardApiConfig {
  readonly key: string
}

export const DashboardApiConfigSymbol = Symbol.for('IDashboardApiConfig')

@injectable()
export class DashboardApiConfig implements IDashboardApiConfig {
  readonly key: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('dashboardApi')) {
      throw new ConfigError('dashboardApi config is missing')
    }

    this.key = config.get<string>('dashboardApi.key')
  }
}
