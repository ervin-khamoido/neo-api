2021

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { Container } from 'inversify'
import { CurrentOrderSymbol, CurrentUserSymbol } from '../middleware'
import { FeatureConfigSymbol, IFeatureConfig } from '../models/config/feature.config'
import { OrderModel, UserModel } from '../models/db'

export enum LoggerLevel {
  Log = 'log',
  Debug = 'debug',
  Trace = 'trace',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

interface ILoggerContext {
  user: UserModel | null
  order: OrderModel | null
}

export const setupExtendedLogger = (container: Container): void => {
  const originalLoggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
  const loggerContextConfig = container.get<IFeatureConfig>(FeatureConfigSymbol).loggerContext

  container
    .rebind(LoggerFactorySymbol)
    .toDynamicValue(({ container }) => {
      const contextRetriever = () => {
        let user: UserModel | null = null
        let order: OrderModel | null = null

        if (container.isBound(CurrentUserSymbol)) {
          user = container.get<UserModel | null>(CurrentUserSymbol)
        }

        if (container.isBound(CurrentOrderSymbol)) {
          order = container.get<OrderModel | null>(CurrentOrderSymbol)
        }

        return { user, order }
      }

      return (name: string) => new ExtendedLogger(originalLoggerFactory(name), contextRetriever, loggerContextConfig)
    })
    .inRequestScope()
}

export class ExtendedLogger implements ILogger {
  private readonly logger: ILogger
  private readonly loggerContextConfig: Record<LoggerLevel, boolean> | null
  private readonly contextRetriever: () => ILoggerContext

  constructor(
    logger: ILogger,
    contextRetriever: () => ILoggerContext,
    loggerContextConfig: Record<LoggerLevel, boolean> | null,
  ) {
    this.logger = logger
    this.loggerContextConfig = loggerContextConfig
    this.contextRetriever = contextRetriever
  }

  log(message: string, ...extra: unknown[]): void {
    const params = this.getParams(`LOG: ${message}`, extra, LoggerLevel.Log)
    this.logger.log(...params)
  }

  info(message: string, ...extra: unknown[]): void {
    const params = this.getParams(`INFO: ${message}`, extra, LoggerLevel.Info)
    this.logger.info(...params)
  }

  warn(message: string, ...extra: unknown[]): void {
    const params = this.getParams(`WARNING: ${message}`, extra, LoggerLevel.Warn)
    this.logger.warn(...params)
  }

  error(error: string | Error, ...extra: unknown[]): void {
    const message = error instanceof Error ? `${error.stack}` : error
    const extras = this.getExtras(extra, LoggerLevel.Error)
    const fullMessage = `ERROR: ${message}\n${extras?.map(i => JSON.stringify(i)).join(' ')}`

    this.logger.error(fullMessage)
  }

  trace(message: string, ...extra: unknown[]): void {
    const params = this.getParams(`TRACE: ${message}`, extra, LoggerLevel.Trace)
    this.logger.trace(...params)
  }

  debug(message: string, ...extra: unknown[]): void {
    const params = this.getParams(`DEBUG: ${message}`, extra, LoggerLevel.Debug)
    this.logger.debug(...params)
  }

  private getParams<T>(message: T, extra: unknown[], loggerLevel: LoggerLevel) {
    const context = this.getExtras(extra, loggerLevel)

    const params: [T, ...unknown[]] = context ? [message, ...context] : [message]

    return params
  }

  private getExtras(extra: unknown[], loggerLevel: LoggerLevel): unknown[] | undefined {
    const extras = []

    const loggerContextEnabled = this.getLoggerContextEnabled(loggerLevel)

    if (loggerContextEnabled) {
      const context = this.contextRetriever()

      const user = context?.user?.uid
      if (user) {
        extras.push(`User: ${user}`)
      }

      const order = context?.order?.referenceNumber
      if (order) {
        extras.push(`Order: ${order}`)
      }
    }

    if (extra) {
      extras.push(...extra)
    }

    return extras
  }

  private getLoggerContextEnabled(loggerLevel: LoggerLevel) {
    if (this.loggerContextConfig) {
      return this.loggerContextConfig[loggerLevel]
    }

    return false
  }
}
