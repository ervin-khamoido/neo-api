import { inject, injectable } from 'inversify'

import { ILogger, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'

import { IMailerService, IMessage } from './mailer.service'

@injectable()
export class ConsoleMailerService implements IMailerService {
  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(ConsoleMailerService)
  }

  async send(payload: IMessage): Promise<void> {
    this.logger.info(JSON.stringify(payload, null, 4))
  }
}
