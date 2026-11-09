2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import _ from 'lodash'

import {
  UserAmbassadorModel,
  UserAmbassadorEntityServiceSymbol,
  IUserAmbassadorEntityService,
  UserModel,
} from '../models/db'

export interface IAmbassadorService {
  getActiveAmbassador(userId: number): Promise<UserAmbassadorModel | null>

  addOrUpdateAmbassadors(users: UserModel[], levelId: number, updatedBy: string): Promise<void>
  deleteAmbassadors(users: UserModel[], updatedBy: string): Promise<void>
}

export const AmbassadorServiceSymbol = Symbol.for('IAmbassadorService')

@injectable()
export class AmbassadorService implements IAmbassadorService {
  @inject(UserAmbassadorEntityServiceSymbol) userAmbassadorEntityService!: IUserAmbassadorEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(AmbassadorService)
  }

  async getActiveAmbassador(userId: number): Promise<UserAmbassadorModel | null> {
    const userAmbassador = await this.userAmbassadorEntityService.getOne({ userId })
    if (userAmbassador && userAmbassador.isDeleted) {
      return null
    }

    return userAmbassador
  }

  async addOrUpdateAmbassadors(users: UserModel[], levelId: number, updatedBy: string): Promise<void> {
    const userIds = users.map(x => x.id)

    const existingAmbassadorRecords = await this.userAmbassadorEntityService.get(x => x.userId.in(userIds))

    const userIdsToUpdate = existingAmbassadorRecords.map(x => x.userId)
    const userIdsToInsert = _.difference(userIds, userIdsToUpdate)

    // Update the existing ambassador records
    if (userIdsToUpdate.length > 0) {
      await this.userAmbassadorEntityService.update(
        { ambassadorLevelId: levelId, isDeleted: false, updatedBy: updatedBy },
        x => x.userId.in(userIdsToUpdate),
      )
    }

    // Add new ambassador records
    if (userIdsToInsert.length > 0) {
      await this.userAmbassadorEntityService.add(
        userIdsToInsert.map(x => ({
          userId: x,
          ambassadorLevelId: levelId,
          createdBy: updatedBy,
          updatedBy: updatedBy,
        })),
      )
    }
  }

  async deleteAmbassadors(users: UserModel[], updatedBy: string): Promise<void> {
    const userIdsToDelete = users.map(x => x.id)

    await this.userAmbassadorEntityService.update({ isDeleted: true, updatedBy: updatedBy }, x =>
      x.userId.in(userIdsToDelete),
    )
  }
}
