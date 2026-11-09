2021

import { inject, injectable } from 'inversify'

import { ITokenService, TokenService } from '../../lib/services/token/token.service'
import { PinTokenConfigSymbol, ITokenConfig } from '../../lib/models/config'
import { OneTimeAction } from '../pin-code.service'

export interface IOneTimePayload {
  user: string // uuid
  action: OneTimeAction

  aud?: string | string[]
  exp?: Date | number
  iat?: Date | number
}

export const OneTimeTokenServiceSymbol = Symbol.for('ITokenService<IOneTimePayload>')

@injectable()
export class OneTimeTokenService extends TokenService<IOneTimePayload> implements ITokenService<IOneTimePayload> {
  constructor(@inject(PinTokenConfigSymbol) configs: ITokenConfig) {
    super(configs)
  }

  public sign(payload: IOneTimePayload): string {
    if (payload.exp instanceof Date) {
      payload.exp = Math.ceil(payload.exp.getTime() / 1000)
    }

    if (payload.iat instanceof Date) {
      payload.iat = Math.ceil(payload.iat.getTime() / 1000)
    }

    return super.sign(payload)
  }
}
