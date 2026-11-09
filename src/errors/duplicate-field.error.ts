2021

import { RequestError } from '@ts-awesome/rest'

export class DuplicateFieldError extends RequestError {
  public field: string
  public value: string

  constructor(field: string, value: string) {
    super(`Key '${value}' already exists for field '${field}'.`, 'DuplicateError', 409)

    this.field = field
    this.value = value

    Object.setPrototypeOf(this, DuplicateFieldError.prototype)
  }
}
