2021

import { RequestError, StatusCode } from '@ts-awesome/rest'

export class ConflictError extends RequestError {
  constructor(msg: string) {
    super(msg, 'ConflictError', StatusCode.Conflict)

    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}
