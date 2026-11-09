import { inject, injectable } from 'inversify'
import { IConfig } from 'config'
import { ConfigSymbol } from '@ts-awesome/logger'

export interface IUsernameConfig {
  readonly blacklist: string[]
}

export const UsernameConfigSymbol = Symbol.for('IUsernameConfig')

@injectable()
export class UsernameConfig implements IUsernameConfig {
  readonly blacklist!: string[]

  constructor(@inject(ConfigSymbol) config: IConfig) {
    const rawValue = config.get<string>('username.blacklist')

    this.blacklist = JSON.parse(rawValue) ?? []
  }
}
