2021

import { inject, injectable } from 'inversify'

import { UserSettingsEntityServiceSymbol, IUserSettingsEntityService } from '../models/db'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

export interface IAppLockService {
  enableAppLock(userId: number): Promise<void>
  disableAppLock(userId: number): Promise<void>
}

export const AppLockServiceSymbol = Symbol.for('IAppLockService')

@injectable()
export class AppLockService implements IAppLockService {
  @inject(UserSettingsEntityServiceSymbol) userSettingsEntityService!: IUserSettingsEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(AppLockService)
  }

  async enableAppLock(userId: number): Promise<void> {
    await this.userSettingsEntityService.updateOne({
      userId: userId,
      enableAppLock: true,
    })
  }

  async disableAppLock(userId: number): Promise<void> {
    await this.userSettingsEntityService.updateOne({
      userId: userId,
      enableAppLock: false,
    })
  }
}
