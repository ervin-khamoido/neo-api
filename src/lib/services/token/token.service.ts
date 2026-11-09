import { injectable } from 'inversify'
import jwt, { Algorithm } from 'jsonwebtoken'

import { ITokenConfig } from '../../models/config'

export type JWTVerifyExtra = {
  issuer?: string
  audience?: string | RegExp
  subject?: string
}

export interface ITokenService<T> {
  sign(payload: T): string
  verify(token: string, extra?: JWTVerifyExtra): T
}

@injectable()
export class TokenService<T extends object> implements ITokenService<T> {
  private get algorithm(): Algorithm {
    return `${this.configs.algorithm.type}${this.configs.algorithm.bit}` as Algorithm
  }

  constructor(private readonly configs: ITokenConfig) {}

  private get signSecret() {
    const { algorithm: algo } = this.configs

    if (algo.type === 'HS') {
      return algo.secret
    } else if (algo.passphrase != null) {
      return {
        key: algo.privateKey,
        passphrase: algo.passphrase,
      }
    } else {
      return algo.privateKey
    }
  }

  private get verifySecret() {
    const { algorithm: algo } = this.configs

    if (algo.type === 'HS') {
      return algo.secret
    } else if (algo.passphrase != null) {
      return {
        key: algo.publicKey,
        passphrase: algo.passphrase,
      }
    } else {
      return algo.publicKey
    }
  }

  public sign(payload: T): string {
    const options = {
      ...this.configs,
      algorithm: this.algorithm,
    }

    return jwt.sign(payload, this.signSecret, options)
  }

  public verify(token: string, extra?: JWTVerifyExtra): T {
    const options = {
      ...this.configs,
      ...extra,
      algorithms: [this.algorithm],
    }

    return jwt.verify(token, this.verifySecret, options) as T
  }
}
