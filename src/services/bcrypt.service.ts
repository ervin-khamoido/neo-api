2021

import { inject, injectable } from 'inversify'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import bcrypt from 'bcrypt'

export interface IBcryptService {
  hashPassword(password: any): Promise<string>
  comparePassword(password: string, hashedPassword: string): Promise<boolean>
}

export const BcryptServiceSymbol = Symbol.for('IBcryptService')

@injectable()
export class BcryptService implements IBcryptService {
  private logger: ILogger
  private defaultSaltRounds = 10

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(BcryptService)
  }

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.defaultSaltRounds)
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
      throw err
    }
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword)
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
      throw err
    }
  }
}
