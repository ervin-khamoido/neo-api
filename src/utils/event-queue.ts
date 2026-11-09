import { Queue, QueueOptions } from 'bullmq'
import { IncomingWalletProcessorQueue } from '../microservice/incoming-wallet-processor/model/queue.config'
import { interfaces } from 'inversify'

export const EventQueueSymbol = Symbol.for('EventQueue')

export const EventQueueFactorySymbol = Symbol.for('EventQueueFactory')
export type EventQueueFactory = (name: string) => Queue | null
export const eventQueueFactory = ({
  container,
}: {
  container: interfaces.Container
}): EventQueueFactory => queueName => {
  if (container.isBoundNamed(EventQueueSymbol, queueName)) {
    return container.getNamed<Queue>(EventQueueSymbol, queueName)
  } else {
    return null
  }
}

export const DefaultQueueOptions: QueueOptions = {
  streams: {
    events: {
      maxLen: 100,
    },
  },
  sharedConnection: true,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30 * 1000, // 30s, 1m, 2m
    },
    removeOnFail: 1000,
    removeOnComplete: true,
  },
}

export const EventQueueOptions = Object.freeze({
  // to override the default options for the queue
  // [PushQueueV1]: { ...DefaultQueueOptions, sharedConnection },
  [IncomingWalletProcessorQueue]: {
    ...DefaultQueueOptions,
    defaultJobOptions: {
      ...DefaultQueueOptions.defaultJobOptions,
      attempts: 0,
    },
  },
})
