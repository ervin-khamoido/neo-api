import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IRedisConfig {
  readonly port: number
  readonly host: string
  readonly password: string
}

export const RedisConfigSymbol = Symbol.for('IRedisConfig')

@injectable()
export class RedisConfig implements IRedisConfig {
  readonly port!: number
  readonly host!: string
  readonly password!: string

  constructor(@inject(ConfigSymbol) config: IConfig) {
    if (!config.has('redis')) {
      throw new ConfigError('mailer configuration is missing')
    }

    this.port = config.get('redis.port')
    this.host = config.get('redis.host')
    this.password = config.get('redis.password')
  }
}
