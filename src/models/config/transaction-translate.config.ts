import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ConfigError } from '@ts-awesome/rest'
import { ConfigSymbol, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { isValid, parse } from 'date-fns'

export interface ITransactionAvailabilityConfig {
  readonly after: string
  readonly showAt: string
  readonly showHours: number
}

export const TransactionAvailabilityConfigSymbol = Symbol.for('ITransactionAvailabilityConfig')

export const HOURS_TIME_FORMAT = 'hh:mm:ss a XXXX'

const DEFAULT_TRANSACTION_AVAILABILITY_AFTER = '04:00:00 PM +0100'
const DEFAULT_TRANSACTION_AVAILABILITY_SHOW_AT = '03:00:00 PM +0100'
const DEFAULT_TRANSACTION_AVAILABILITY_SHOW_HOURS = 10

@injectable()
export class TransactionAvailabilityConfig implements ITransactionAvailabilityConfig {
  readonly after: string
  readonly showAt: string
  readonly showHours: number

  constructor(@inject(ConfigSymbol) config: IConfig, @inject(LoggerFactorySymbol) factory: ILoggerFactory) {
    const logger = factory(TransactionAvailabilityConfig)

    if (!config.has('transactionAvailability')) {
      throw new ConfigError('transactionAvailability configuration is missing')
    }

    this.after = config.get<string>('transactionAvailability.after')
    this.showAt = config.get<string>('transactionAvailability.showAt')
    this.showHours = parseInt(config.get<string>('transactionAvailability.showHours'), 10)

    const parsedAfter = parse(this.after, HOURS_TIME_FORMAT, new Date())
    const showAt = parse(this.showAt, HOURS_TIME_FORMAT, new Date())
    if (!isValid(parsedAfter) || !isValid(showAt) || isNaN(this.showHours)) {
      this.after = DEFAULT_TRANSACTION_AVAILABILITY_AFTER
      this.showAt = DEFAULT_TRANSACTION_AVAILABILITY_SHOW_AT
      this.showHours = DEFAULT_TRANSACTION_AVAILABILITY_SHOW_HOURS

      logger.warn(
        `Invalid transactionAvailability config! Fallback to defaults: ${this.after}, ${this.showAt}, ${this.showHours}`,
      )
    }
  }
}
