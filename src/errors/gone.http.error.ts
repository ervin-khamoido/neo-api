import { RequestError } from '@ts-awesome/rest'

export class GoneHttpError extends RequestError {
  constructor(msg: string) {
    super(msg, 'Gone', 410)
  }
}
