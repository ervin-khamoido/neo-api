2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { EventQueueFactory, EventQueueFactorySymbol } from '../../utils/event-queue'

export interface ISchedulerBusinessService {
  scheduleRepeatableJob<T>(queue: string, payload: RepeatableJobPayload<T>): Promise<void>
}

export const SchedulerBusinessServiceSymbol = Symbol.for('ISchedulerBusinessService')

@injectable()
export class SchedulerBusinessService implements ISchedulerBusinessService {
  @inject(EventQueueFactorySymbol) queueFactory!: EventQueueFactory

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(SchedulerBusinessService)
  }

  private async removeRepeatableJob(queueName: string, payload: RepeatableJobPayload<unknown>): Promise<void> {
    const { name, data, deprecatedJobKeys, options } = payload

    const queue = this.queueFactory(queueName)
    if (!queue) {
      this.logger.error(
        `critical: Removing the repeating job is failed for ${queueName}.` +
          ` Job: ${name} | ${JSON.stringify(data)} | ${JSON.stringify(options.repeat)}`,
      )
      throw new Error(`Unknown queue name ${queueName}`)
    }

    try {
      for (const deprecatedKey of deprecatedJobKeys) {
        await queue.removeRepeatableByKey(deprecatedKey)
      }

      await queue.removeRepeatableByKey(options.repeatJobKey!)
    } catch (err: any) {
      this.logger.error(err)
      this.logger.error(
        `critical: Removing the repeating job is failed for ${queueName}.` +
          ` Job: ${name} | ${JSON.stringify(data)} | ${JSON.stringify(options.repeat)}`,
      )

      throw err
    }
  }

  async scheduleRepeatableJob<T>(queueName: string, payload: RepeatableJobPayload<T>): Promise<void> {
    const { options, name, data } = payload

    const queue = this.queueFactory(queueName)
    if (!queue) {
      this.logger.error(
        `critical: Removing the repeating job is failed for ${queueName}.` +
          ` Job: ${name} | ${JSON.stringify(data)} | ${JSON.stringify(options.repeat)}`,
      )
      throw new Error(`Unknown queue name ${queueName}`)
    }

    try {
      await this.removeRepeatableJob(queueName, payload)
      await queue.add(name, data, options)

      this.logger.info(
        `The repeating job is added for ${queueName}.` +
          ` Job: ${name} | ${JSON.stringify(data)} | ${JSON.stringify(options.repeat)}`,
      )
    } catch (err: any) {
      this.logger.error(err)
      this.logger.error(
        `critical: The repeating job is failed for ${queueName}.` +
          ` Job: ${name} | ${JSON.stringify(data)} | ${JSON.stringify(options.repeat)}`,
      )

      throw err
    }
  }
}

export type RepeatableJobPayload<TData> = {
  name: string
  data: TData
  deprecatedJobKeys: string[]
  options: {
    jobId: string
    repeatJobKey: string
    repeat: {
      // https://crontab.guru
      pattern: string
    }
  }
}
