import { inject, injectable } from 'inversify'
import { LoggerFactorySymbol } from '@ts-awesome/logger'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'

import { IncomingWalletProcessorQueue } from './model/queue.config'
import { WorkerFactory, WorkerFactorySymbol } from '../common/worker.factory'
import { ISingleEventBaseService, SingleEventBaseService } from '../common/single-event-base.service'
import { IRedisConfig, RedisConfigSymbol } from '../../lib/models/config'
import { MoveMoneyEventData } from './model/move-money-event.data'
import {
  IReceiveMoneyBusinessService,
  ReceiveMoneyBusinessServiceSymbol,
} from '../../services/business/receive/receive-money.business.service'
import { sleep } from '../../utils/sleep'
import { ICursorBasedResult } from '../../services/modern-treasury.service'

const USER_BATCH_SIZE = 20

export interface IIncomingWalletService extends ISingleEventBaseService {}

@injectable()
export class IncomingWalletService
  extends SingleEventBaseService<MoveMoneyEventData>
  implements IIncomingWalletService {
  @inject(ReceiveMoneyBusinessServiceSymbol) receiveMoneyBusinessService!: IReceiveMoneyBusinessService

  constructor(
    @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory,
    @inject(WorkerFactorySymbol) workerFactory: WorkerFactory,
    @inject(RedisConfigSymbol) redisConfig: IRedisConfig,
  ) {
    super(
      IncomingWalletService.name,
      IncomingWalletProcessorQueue,
      MoveMoneyEventData,
      loggerFactory,
      workerFactory,
      redisConfig,
    )
  }

  protected async doJob(jobData: MoveMoneyEventData): Promise<void> {
    const { user } = jobData

    let nextCursor: string | null = null
    let batchNo = 1
    do {
      let users = []

      if (user) {
        nextCursor = null
        users = [user]
      } else {
        const result: ICursorBasedResult<string> = await this.receiveMoneyBusinessService.getUsersWithIncomingWallet(
          USER_BATCH_SIZE,
          nextCursor,
        )

        nextCursor = result.cursor
        users = result.items
      }

      if (users.length <= 0) {
        this.logger.info(`Batch #${batchNo} Report | No users to process`)

        break
      }

      const batchErrors = await this.doBatch(users)
      this.logger.info(
        `Batch #${batchNo} Report | Success: ${users.length - batchErrors.length} Failure: ${batchErrors.length}.\n` +
          (batchErrors.length ? `${JSON.stringify(batchErrors)}` : ''),
      )

      batchNo++
    } while (!!nextCursor)
  }

  private async doBatch(users: string[]): Promise<{ user: string; error: any }[]> {
    const failures: { user: string; error: any }[] = []

    for (const user of users) {
      try {
        await this.receiveMoneyBusinessService.transferMaxFromIncomingToSaving(user)
      } catch (err) {
        failures.push({
          user: user,
          error: err,
        })
      }

      await sleep(200)
    }

    return failures
  }
}
