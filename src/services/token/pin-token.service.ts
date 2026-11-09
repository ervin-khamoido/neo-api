2021

import { inject, injectable } from 'inversify'

import { ITokenService, TokenService } from '../../lib/services/token/token.service'
import { PinTokenConfigSymbol, ITokenConfig } from '../../lib/models/config'

export interface IPinPayload {
  user: string // uuid

  aud?: string | string[]
  exp?: Date | number
  iat?: Date | number
}

export const PinTokenServiceSymbol = Symbol.for('ITokenService<IPinPayload>')

@injectable()
export class PinTokenService extends TokenService<IPinPayload> implements ITokenService<IPinPayload> {
  constructor(@inject(PinTokenConfigSymbol) configs: ITokenConfig) {
    super(configs)
  }

  public sign(payload: IPinPayload): string {
    if (payload.exp instanceof Date) {
      payload.exp = Math.ceil(payload.exp.getTime() / 1000)
    }

    if (payload.iat instanceof Date) {
      payload.iat = Math.ceil(payload.iat.getTime() / 1000)
    }

    return super.sign(payload)
  }
}
