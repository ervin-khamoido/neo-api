import { RequestError } from '@ts-awesome/rest/dist/errors'

export enum BadRequestContextType {
  ValidationMessage = 'validation_message',
}

export interface IBadRequestContext<T> {
  type: BadRequestContextType
  data: T
}

export class ValidationMessageContext implements IBadRequestContext<string> {
  readonly type
  readonly data

  constructor(message: string) {
    this.type = BadRequestContextType.ValidationMessage
    this.data = message
  }
}

export class BadRequestContextError<T> extends RequestError {
  constructor(public data?: IBadRequestContext<T>) {
    super('Contextual Error', 'BadRequest', 400)
  }
}
