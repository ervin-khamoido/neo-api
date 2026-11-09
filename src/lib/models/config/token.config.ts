import { injectable, unmanaged } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/config'

export interface HMAC_SHA {
  type: 'HS'
  bit: '256' | '384' | '512'
  secret: string | Buffer
}

export interface RSA_SHA {
  type: 'RS' | 'ES' | 'PS'
  bit: '256' | '384' | '512'
  publicKey: string | Buffer
  privateKey: string | Buffer
  passphrase?: string
}

export interface ITokenConfig {
  readonly algorithm: HMAC_SHA | RSA_SHA
  readonly expiresIn?: number
  readonly audience?: string
  readonly issuer?: string
  readonly subject?: string
}

@injectable()
export class TokenConfig implements ITokenConfig {
  readonly algorithm!: HMAC_SHA | RSA_SHA

  constructor(@unmanaged() key: string, @unmanaged() config: IConfig) {
    const token = config.get<Configs>(key)

    if (!token.secret) {
      throw new ConfigError(`${key}.secret is required configuration`)
    }

    this.algorithm = {
      secret: token.secret ?? 'gb-sustain-jwt-secret',
      type: 'HS',
      bit: '256',
    }
  }
}

type Configs = Omit<ITokenConfig, 'algorithm'> & { secret: string }
