import { injectable, interfaces, unmanaged } from 'inversify'
import { Job, Worker } from 'bullmq'
import { ILogger } from '@ts-awesome/logger'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'
import read from '@ts-awesome/model-reader'

import { IRedisConfig } from '../../lib/models/config'
import { WorkerFactory } from './worker.factory'
import { formatDuration, formatISO, intervalToDuration } from 'date-fns'

export interface ISingleEventBaseService {
  start(): Promise<void>
  stop(): Promise<void>
}

@injectable()
export abstract class SingleEventBaseService<TData> implements ISingleEventBaseService {
  protected logger: ILogger
  protected worker: Worker

  constructor(
    @unmanaged() name: string,
    @unmanaged() queue: string,
    @unmanaged() private Model: interfaces.Newable<TData>,
    @unmanaged() loggerFactory: ILoggerFactory,
    @unmanaged() workerFactory: WorkerFactory,
    @unmanaged() private redisConfig: IRedisConfig,
  ) {
    const loggerName = `${name}|${process.pid}`
    this.logger = loggerFactory(loggerName)

    this.worker = workerFactory(queue, job => this.onJob(job), { connection: this.redisConfig, autorun: false })
    this.worker.on('failed', (job, reason) => this.onJobFailure(job, reason))
    this.worker.on('error', reason => this.onJobError(reason))
  }

  async start(): Promise<void> {
    this.worker.run()

    this.logger.info(`start worker. Worker ID = ${this.worker.id}`)
  }

  async stop(): Promise<void> {
    this.logger.info(`stop worker. Worker ID = ${this.worker?.id}`)

    await this.worker.pause(true)
  }

  private async onJob(job: Job<TData>) {
    const startAt = new Date()
    this.logger.info(`JOB - Started on ${formatISO(startAt)}`)
    this.logger.info(`JOB INFO - name: ${job.name}. data: ${JSON.stringify(job.data)}`)

    // validation
    let jobData: TData | null
    try {
      jobData = read(job.data, this.Model)
    } catch (err: any) {
      this.logger.warn(`stop job. reason: ${err}`)
      this.logger.error(err)
      return
    }

    if (!jobData) {
      this.logger.warn(`stop job. reason: read() returned null`)
      return
    }

    // execution
    try {
      await this.doJob(jobData!)
    } finally {
      //JOB - Done in 5 minutes 43 seconds
      const finishedAt = new Date()
      const duration = intervalToDuration({ start: startAt, end: finishedAt })
      this.logger.info(`JOB - Done in ${formatDuration(duration)}`)
    }
  }

  async onJobFailure(job: Job, err: Error): Promise<void> {
    this.logger.error(err)
  }

  async onJobError(err: Error): Promise<void> {
    this.logger.error(err)
  }

  protected abstract doJob(jobData: TData): Promise<void>
}
