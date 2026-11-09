import { inject, injectable } from 'inversify'
import { LoggerFactorySymbol } from '@ts-awesome/logger'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'
import { isAfter, isBefore } from 'date-fns'
import fbAdmin, { FirebaseError } from 'firebase-admin'
import { TokenMessage } from 'firebase-admin/lib/messaging'
import { isNil } from 'lodash'

import { PushQueueV1 } from './common'
import { PushEventData } from './model'
import { WorkerFactory, WorkerFactorySymbol } from '../common/worker.factory'
import { ISingleEventBaseService, SingleEventBaseService } from '../common/single-event-base.service'
import { IUserPushEntityService, UserPushEntityServiceSymbol, UserPushModel } from '../../models/db'
import { IPushData } from '../../models/push/push-message'
import { IRedisConfig, RedisConfigSymbol } from '../../lib/models/config'

export interface IPushService extends ISingleEventBaseService {
  start(): Promise<void>
  stop(): Promise<void>
}

@injectable()
export class PushService extends SingleEventBaseService<PushEventData> implements ISingleEventBaseService {
  @inject(UserPushEntityServiceSymbol) userPushEntityService!: IUserPushEntityService

  constructor(
    @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory,
    @inject(WorkerFactorySymbol) workerFactory: WorkerFactory,
    @inject(RedisConfigSymbol) redisConfig: IRedisConfig,
  ) {
    super(PushService.name, PushQueueV1, PushEventData, loggerFactory, workerFactory, redisConfig)
  }

  protected async doJob(jobData: PushEventData): Promise<void> {
    const messages = await this.process(jobData)

    if (messages.length === 0) {
      this.logger.warn(`stop job. reason: messages.length === 0`)
      return
    }

    await this.dispatch(messages)
  }

  private async process(data: PushEventData): Promise<TokenMessage[]> {
    const { userId, showOnForeground, payload, data: pushData } = data

    let userPushes = await this.userPushEntityService.get({ userId })
    this.logger.info(`${userId} has ${userPushes.length} token(s) before housekeeping`)

    userPushes = await this.housekeeping(userPushes)
    this.logger.info(`${userId} has ${userPushes.length} token(s) after housekeeping`)

    switch (payload.version) {
      case 'v1': {
        const { version, ...notification } = payload

        return userPushes.map(x => {
          const message = {
            token: x.token,
            notification,
            data: { ...DefaultPushData, ...pushData },
          }

          if (!isNil(showOnForeground)) {
            message.data.showOnForeground = `${showOnForeground}`
          }

          return message
        })
      }
      default:
        this.logger.warn(`the push payload version is not supported`)
        return []
    }
  }

  private async housekeeping(models: readonly UserPushModel[]): Promise<UserPushModel[]> {
    // https://firebase.google.com/docs/cloud-messaging/manage-tokens
    const now = new Date()
    const validTokens = models.filter(x => isBefore(now, x.expiresAt))
    const staleTokenIds = models.filter(x => isAfter(now, x.expiresAt)).map(x => x.id)

    await this.userPushEntityService.delete(x => x.id.in(staleTokenIds))

    return validTokens
  }

  private async dispatch(messages: TokenMessage[]) {
    const { responses } = await fbAdmin.messaging().sendAll(messages)

    const processResponsePromises = responses.map(async (x, i) => {
      const error = responses[i].error

      if (error) {
        await this.handleMessagingError(messages[i], error)
      }
    })

    await Promise.all(processResponsePromises)
  }

  private async handleMessagingError(message: TokenMessage, error: FirebaseError): Promise<void> {
    switch (error.code) {
      // https://firebase.google.com/docs/cloud-messaging/manage-tokens
      case FirebaseMessagingErrorCode.Unregistered:
      case FirebaseMessagingErrorCode.InvalidArgument:
      case FirebaseMessagingErrorCode.TokenUnregistered:
        await this.userPushEntityService.delete({ token: message.token })
        break
      default:
        this.logger.error(`[${error.code}] ${error.message}. `, error.stack)
        break
    }
  }
}

const enum FirebaseMessagingErrorCode {
  UnspecifiedError = 'messaging/unspecified_error',
  InvalidArgument = 'messaging/invalid_argument',
  Unregistered = 'messaging/unregistered',
  TokenUnregistered = 'messaging/registration-token-not-registered',
  SenderIdMismatch = 'messaging/sender_id_mismatch',
  QuotaExceeded = 'messaging/quota_exceeded',
  Unavailable = 'messaging/unavailable',
  Internal = 'messaging/internal',
  ThirdPartyAuthError = 'messaging/third_party_auth_error',
}

const DefaultPushData: IPushData = {
  showOnForeground: 'true',
}
