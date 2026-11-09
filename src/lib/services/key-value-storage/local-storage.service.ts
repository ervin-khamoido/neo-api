import { injectable } from 'inversify'
import { addSeconds, isBefore } from 'date-fns'

import { IKeyValueStorageService } from './key-value-storage.service'

@injectable()
export class LocalStorageService implements IKeyValueStorageService {
  private _codes = new Map<string, { value: string; expiresAt: Date }>()

  async set(key: string, value: string, seconds = 60 * 5): Promise<void> {
    const now = new Date()
    const expiresAt = addSeconds(now, seconds)

    // EX - seconds, PX - milliseconds
    await this._codes.set(key, { value, expiresAt })
  }

  async get(key: string): Promise<string | null> {
    this.housekeeping()

    const item = this._codes.get(key)

    return item?.value ?? null
  }

  async getDel(key: string): Promise<string | null> {
    const value = await this.get(key)
    if (value) {
      this._codes.delete(key)
    }

    return value
  }

  async exists(key: string): Promise<boolean> {
    this.housekeeping()

    return this._codes.has(key)
  }

  async delete(key: string): Promise<void> {
    this._codes.delete(key)
  }

  private housekeeping() {
    const now = new Date()

    for (const [key, item] of this._codes.entries()) {
      if (isBefore(item.expiresAt, now)) {
        this._codes.delete(key)
      }
    }
  }
}
