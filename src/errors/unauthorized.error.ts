2021

import { RequestError } from '@ts-awesome/rest/dist/errors'

export enum UnauthorizedReason {
  PinCodeToken = 'pin_code_token',
  OneTimeToken = 'one_time_token',
  Blocked = 'blocked',
}

export interface IUnauthorizedData {
  reason: UnauthorizedReason
}

export class UnauthorizedError extends RequestError {
  constructor(message?: string, public data?: IUnauthorizedData) {
    super(message || 'Unauthorized Error', 'Unauthorized', 401)

    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}
