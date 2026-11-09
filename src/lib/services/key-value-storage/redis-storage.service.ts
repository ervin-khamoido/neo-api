import { injectable } from 'inversify'
import { ILogger, ILoggerFactory } from '@ts-awesome/logger'
import { Redis } from 'ioredis'

import { IKeyValueStorageService } from './key-value-storage.service'

@injectable()
export class RedisService implements IKeyValueStorageService {
  private logger: ILogger

  constructor(private client: Redis, loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(RedisService)
  }

  async set(key: string, value: string, seconds = 60 * 5): Promise<void> {
    // EX - seconds, PX - milliseconds
    await this.client.set(key, value, 'EX', seconds)
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async getDel(key: string): Promise<string | null> {
    return this.client.getdel(key)
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key)

    return count === 1
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }
}
