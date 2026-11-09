import { readable } from '@ts-awesome/model-reader'

export class BitgoError extends Error {
  constructor(msg: string, readonly payload: object | null) {
    super(msg)
  }
}
