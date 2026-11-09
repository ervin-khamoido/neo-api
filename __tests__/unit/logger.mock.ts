import { ILogger, Named } from '@ts-awesome/logger'

export class Logger implements ILogger {
  log(message: string, ...extra: unknown[]): void {}
  info(message: string, ...extra: unknown[]): void {}
  warn(message: string, ...extra: unknown[]): void {}
  error(error: string | Error, ...extra: unknown[]): void {}
  trace(message: string, ...extra: unknown[]): void {}
  debug(message: string, ...extra: unknown[]): void {}
}

export function NoopLoggerFactory(_: string | Named) {
  return new Logger()
}
