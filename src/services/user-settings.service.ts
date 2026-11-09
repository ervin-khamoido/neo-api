2021

import { inject, injectable } from 'inversify'

import {
  UserSettingsEntityServiceSymbol,
  IUserSettingsEntityService,
  CurrencyType,
  UserSettingsModel,
} from '../models/db'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

export interface IUserSettingsService {
  getUserSettings(userId: number): Promise<UserSettingsModel | null>
  createDefaultUserSettings(userId: number): Promise<UserSettingsModel>
  updateDefaultCurrency(userId: number, currency: CurrencyType): Promise<UserSettingsModel>
}

export const UserSettingsServiceSymbol = Symbol.for('IUserSettingsService')

@injectable()
export class UserSettingsService implements IUserSettingsService {
  @inject(UserSettingsEntityServiceSymbol) userSettingsEntityService!: IUserSettingsEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserSettingsService)
  }

  async getUserSettings(userId: number): Promise<UserSettingsModel | null> {
    return await this.userSettingsEntityService.getOne({ userId: userId })
  }

  async createDefaultUserSettings(userId: number): Promise<UserSettingsModel> {
    const userSettings = await this.userSettingsEntityService.addOne({
      userId: userId,
      darkMode: false,
      defaultCurrency: CurrencyType.NGN,
      enableAppLock: false,
    })

    return userSettings
  }

  async updateDefaultCurrency(userId: number, currency: CurrencyType): Promise<UserSettingsModel> {
    const userSettings = await this.userSettingsEntityService.updateOne({
      userId: userId,
      defaultCurrency: currency,
    })

    if (!userSettings) {
      throw new Error('Unexpected error: No user settings found')
    }

    return userSettings
  }
}
