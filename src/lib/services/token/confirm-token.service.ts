import { inject, injectable } from 'inversify'

import { ITokenService, TokenService } from './token.service'
import { ITokenConfig } from '../../models/config'
import { ConfirmTokenConfigSymbol } from '../../models/config/confirm-token.config'

export interface IConfirmPayload {
  user: string
  email: string
}

export const ConfirmTokenServiceSymbol = Symbol.for('ITokenService<IConfirmPayload>')

@injectable()
export class ConfirmTokenService extends TokenService<IConfirmPayload> implements ITokenService<IConfirmPayload> {
  constructor(@inject(ConfirmTokenConfigSymbol) configs: ITokenConfig) {
    super(configs)
  }
}
