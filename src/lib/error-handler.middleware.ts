import { inject, injectable } from 'inversify'
import { IErrorMiddleware, IHttpRequest, IHttpResponse } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IErrorOutput } from '../models/response'
import { CustomError, DuplicateFieldError, RequestError, StatusCode, UnauthorizedError } from '../errors'

export const ErrorHandlerMiddlewareSymbol = Symbol.for('ErrorHandlerMiddleware')

@injectable()
export class ErrorHandlerMiddleware implements IErrorMiddleware {
  constructor(@inject(LoggerFactorySymbol) private readonly loggerFactory: ILoggerFactory) {}

  public async handle(err: Error, req: IHttpRequest, res: IHttpResponse): Promise<void> {
    let errorResult: IErrorOutput<unknown>
    if (err instanceof UnauthorizedError) {
      errorResult = {
        error: `Not authorized`,
        code: err.statusCode,
        name: err.name,
        data: err.data,
      }
    } else if (err instanceof DuplicateFieldError) {
      errorResult = {
        error: err.message,
        code: err.statusCode,
        name: err.name,
        data: {
          field: err.field,
          value: err.value,
        },
      }
    } else if (err instanceof CustomError) {
      errorResult = {
        error: err.message,
        code: err.statusCode,
        name: err.name,
        data: {
          errors: err.errors,
        },
      }
    } else if (err instanceof RequestError && err.statusCode !== StatusCode.ServerError) {
      errorResult = {
        error: err.message,
        code: err.statusCode,
        name: err.name,
        data: (err as any)?.data,
      }
    } else {
      const logger = this.loggerFactory(req.url)
      logger.error(err)

      errorResult = {
        error: err.message,
        code: StatusCode.ServerError,
        name: err.name,
        data: (err as any)?.data,
      }
    }

    await res.status(errorResult.code).json(errorResult).end()
  }
}
