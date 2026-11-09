export enum KeyValueStorageProvider {
  Local = 'local',
  Redis = 'redis',
}

export interface IKeyValueStorageService {
  set(key: string, value: string, seconds?: number): Promise<void>
  get(key: string): Promise<string | null>
  getDel(key: string): Promise<string | null>
  exists(key: string): Promise<boolean>
  delete(key: string): Promise<void>
}

export const KeyValueStorageServiceSymbol = Symbol.for('IKeyValueStorageService')
