2021

import { inject, injectable } from 'inversify'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ConfigSymbol } from '@ts-awesome/config'
import { IConfig } from 'config'

import { UserSecretsModel, IUserSecretsEntityService, UserSecretsEntityServiceSymbol } from '../models/db'

export interface IUserSecretsService {
  getUserSecrets(userId: number): Promise<UserSecretsModel | null>
  createDefaultUserSecrets(userId: number): Promise<UserSecretsModel>
}

export const UserSecretsServiceSymbol = Symbol.for('IUserSecretsService')

@injectable()
export class UserSecretsService implements IUserSecretsService {
  @inject(ConfigSymbol) config!: IConfig

  @inject(UserSecretsEntityServiceSymbol) userSecretsEntityService!: IUserSecretsEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserSecretsService)
  }

  async getUserSecrets(userId: number): Promise<UserSecretsModel | null> {
    return await this.userSecretsEntityService.getOne({ userId: userId })
  }

  createDefaultUserSecrets(userId: number): Promise<UserSecretsModel> {
    return this.userSecretsEntityService.addOne({
      userId: userId,
      pin: null,
      pinAttempts: 0,
    })
  }
}
