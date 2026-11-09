2021

export class StorageError extends Error {
  constructor(
    message: string,
    //
    readonly name: string,
    readonly statusCode: number = 0,
    readonly reason?: Error,
  ) {
    super(message)
  }
}
