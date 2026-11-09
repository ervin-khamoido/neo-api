2021

import { RequestError, StatusCode } from '@ts-awesome/rest'

export enum CustomErrorType {
  Validation = 'validation',
}
export interface ICustomErrorObject {
  type: CustomErrorType
  code: string
  message: string
}

export class CustomErrorObject implements ICustomErrorObject {
  type!: CustomErrorType
  code!: string
  message!: string

  constructor(type: CustomErrorType, code: string, message: string) {
    this.type = type
    this.code = code
    this.message = message
  }
}

export class CustomError extends RequestError {
  public errors?: CustomErrorObject[]

  constructor(name: string, statusCode: StatusCode, errors?: CustomErrorObject[], message?: string) {
    super(message || `Custom Error`, name, statusCode)

    this.errors = errors

    Object.setPrototypeOf(this, CustomError.prototype)
  }
}
