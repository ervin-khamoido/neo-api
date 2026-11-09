2021

import { inject, injectable, named } from 'inversify'
import { addDays, isAfter, isBefore } from 'date-fns'
import fbAdmin, { FirebaseError } from 'firebase-admin'
import { TokenMessage } from 'firebase-admin/lib/messaging'
import { Queue } from 'bullmq'
import { ILogger, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'

import { UserModel } from '../models/db'
import { PushSubscribeInput, PushUnsubscribeInput } from '../models/request'
import {
  IUserPushEntityService,
  UserPushEntityServiceSymbol,
  UserPushModel,
  UserPushTokenUniqueIndex,
} from '../models/db'
import { IPushData, IPushMessage } from '../models/push/push-message'
import { EventQueueSymbol } from '../utils/event-queue'

import { PushEvent, PushQueueV1 } from '../microservice/push/common'
import { PushEventData } from '../microservice/push/model'

export interface IPushService {
  subscribe(user: UserModel, payload: PushSubscribeInput): Promise<void>
  unsubscribe(user: UserModel, payload: PushUnsubscribeInput): Promise<void>
  unsubscribeAll(user: UserModel): Promise<void>

  send(user: UserModel, message: IPushMessage, data?: IPushData): Promise<void>
  scheduleSend(data: PushEventData): Promise<void>
}

export const PushServiceSymbol = Symbol.for('IPushService')

const PUSH_TOKEN_EXPIRES_IN_DAYS = 2 * 30 // 2 month

@injectable()
export class PushService implements IPushService {
  @inject(UserPushEntityServiceSymbol) userPushEntityService!: IUserPushEntityService

  @inject(EventQueueSymbol) @named(PushQueueV1) queue!: Queue<PushEventData>

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(PushService)
  }

  async subscribe(user: UserModel, payload: PushSubscribeInput): Promise<void> {
    const now = new Date()

    await this.userPushEntityService.upsertOne(
      {
        ...payload,
        userId: user.id,
        expiresAt: addDays(now, PUSH_TOKEN_EXPIRES_IN_DAYS),
      },
      UserPushTokenUniqueIndex,
    )
  }

  async unsubscribe(user: UserModel, payload: PushUnsubscribeInput): Promise<void> {
    const record = await this.userPushEntityService.getOne({ token: payload.token })

    if (record) {
      await this.userPushEntityService.deleteOne(record)
    }
  }

  async unsubscribeAll(user: UserModel): Promise<void> {
    await this.userPushEntityService.delete(x => x.userId.eq(user.id))
  }

  async send(user: UserModel, message: IPushMessage, data: IPushData = {}): Promise<void> {
    try {
      let userPushes = await this.userPushEntityService.get({ userId: user.id })
      userPushes = await this.housekeeping(userPushes)

      const messages: TokenMessage[] = userPushes.map(x => ({
        token: x.token,
        notification: { ...message },
        data: { ...DefaultPushData, ...data },
      }))

      if (messages.length > 0) {
        const { responses } = await fbAdmin.messaging().sendAll(messages)

        const processResponsePromises = responses.map(async (x, i) => {
          const error = responses[i].error

          if (error) {
            await this.handleMessagingError(messages[i], error)
          }
        })

        await Promise.all(processResponsePromises)
      }
    } catch (err: any) {
      this.logger.error(err, `User: ${user?.uid}`)
    }
  }

  async scheduleSend(data: PushEventData): Promise<void> {
    try {
      await this.queue.add(PushEvent.Push, data)
    } catch (err: any) {
      // swallow the error
      this.logger.error(`critical: could not put a push event in the queue`)
      this.logger.error(err)
    }
  }

  private async handleMessagingError(message: TokenMessage, error: FirebaseError): Promise<void> {
    switch (error.code) {
      // https://firebase.google.com/docs/cloud-messaging/manage-tokens
      case FirebaseMessagingErrorCode.Unregistered:
      case FirebaseMessagingErrorCode.InvalidArgument:
        await this.userPushEntityService.delete({ token: message.token })
        break
      default:
        this.logger.error(`[${error.code}] ${error.message}. `, error.stack)
    }
  }

  private async housekeeping(models: readonly UserPushModel[]): Promise<UserPushModel[]> {
    const now = new Date()
    const validTokens = models.filter(x => isBefore(now, x.expiresAt))
    const staleTokenIds = models.filter(x => isAfter(now, x.expiresAt)).map(x => x.id)

    await this.userPushEntityService.delete(x => x.id.in(staleTokenIds))

    return validTokens
  }
}

const enum FirebaseMessagingErrorCode {
  UnspecifiedError = 'messaging/unspecified_error',
  InvalidArgument = 'messaging/invalid_argument',
  Unregistered = 'messaging/unregistered',
  SenderIdMismatch = 'messaging/sender_id_mismatch',
  QuotaExceeded = 'messaging/quota_exceeded',
  Unavailable = 'messaging/unavailable',
  Internal = 'messaging/internal',
  ThirdPartyAuthError = 'messaging/third_party_auth_error',
}

const DefaultPushData: IPushData = {
  showOnForeground: 'true',
}
