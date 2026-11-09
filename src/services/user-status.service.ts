2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  IUserEntityService,
  UserEntityServiceSymbol,
  IUserDetailsEntityService,
  UserDetailsEntityServiceSymbol,
  UserStatus,
  activeUserStatuses,
} from '../models/db'
import { AppConfigSymbol, IAppConfig } from '../models/config'

import { IUserSettingsService, UserSettingsServiceSymbol } from './user-settings.service'
import { IUserSecretsService, UserSecretsServiceSymbol } from './user-secrets.service'

export interface IUserStatusService {
  calculateUserStatus(userId: number): Promise<UserStatus>
  isActive(status: UserStatus): Promise<boolean>
  isUserActive(userId: number): Promise<boolean>
}

export const UserStatusServiceSymbol = Symbol.for('IUserStatusService')

@injectable()
export class UserStatusService implements IUserStatusService {
  @inject(AppConfigSymbol) appConfig!: IAppConfig

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService

  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService
  @inject(UserSecretsServiceSymbol) userSecretsService!: IUserSecretsService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserStatusService)
  }

  async calculateUserStatus(userId: number): Promise<UserStatus> {
    const [userSettings, userSecrets, userDetails] = await Promise.all([
      this.userSettingsService.getUserSettings(userId),
      this.userSecretsService.getUserSecrets(userId),
      this.userDetailsEntityService.getOne({ userId: userId }),
    ])

    if (!userSettings || !userDetails || !userSecrets) {
      throw new Error('Unexpected: User settings, details, or secrets not found')
    }

    if (!userDetails.isApproved) {
      return UserStatus.ApprovalRequired
    }

    if (userSettings.enableAppLock) {
      if (userSecrets.pinAttempts >= this.appConfig.maxPinAttempts) {
        return UserStatus.PinResetRequired
      }
    }

    return userDetails.status
  }

  async isActive(status: UserStatus): Promise<boolean> {
    return activeUserStatuses.includes(status)
  }

  async isUserActive(userId: number): Promise<boolean> {
    const userStatus = await this.calculateUserStatus(userId)

    return await this.isActive(userStatus)
  }
}
