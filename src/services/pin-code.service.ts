2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ConfigSymbol } from '@ts-awesome/config'
import { IConfig } from 'config'
import crypto from 'crypto'

import { addSeconds } from 'date-fns'

import { IUserSecretsEntityService, UserSecretsEntityServiceSymbol, UserModel } from '../models/db'

import { PinAccessMiddleware } from '../middleware/access/pin-access.middleware'

import { ITokenService } from '../lib/services/token'
import { IPinPayload, PinTokenServiceSymbol } from './token'

import { BcryptServiceSymbol, IBcryptService } from './bcrypt.service'
import { IUserSecretsService, UserSecretsServiceSymbol } from './user-secrets.service'
import { IQueryDriver, SqlQueryDriverSymbol } from '@ts-awesome/orm'
import { ISqlQuery } from '@ts-awesome/orm-pg/dist/interfaces'
import { AppConfigSymbol, IAppConfig } from '../models/config'
import { ForbiddenError } from '@ts-awesome/rest'
import { IOneTimePayload, OneTimeTokenServiceSymbol } from './token/one-time-token.service'
import { AUDIENCE_ONE_TIME } from '../middleware'

export enum OneTimeAction {
  DisableAppLock = 'disable_app_lock',
  ChangePin = 'change_pin',
  CreateFundCardOrder = 'create_fund_card_order',
  CreateSellOrder = 'create_sell_order',
  DeleteNEOBANKAccount = 'delete_neobank_account',
  CreateTransferOrder = 'create_transfer_order',
  UnfreezeCard = 'unfreeze_card',
  CreateOnChainOrder = 'create_on_chain_order',
}

export interface IPinCodeService {
  savePinCode(user: UserModel, pin: string): Promise<void>
  verifyPinCode(user: UserModel, pin: string): Promise<boolean>
  forgetPinCode(userId: number): Promise<void>
  randomPinCode(user: UserModel): Promise<string>

  validatePinAttempts(user: UserModel): Promise<void>
  trackPinAttempt(user: UserModel): Promise<void>
  resetPinAttempts(user: UserModel): Promise<void>

  generatePinToken(user: UserModel): Promise<string>
  generateOneTimeToken(user: UserModel, action: OneTimeAction): Promise<string>
}

export const PinCodeServiceSymbol = Symbol.for('IPinCodeService')

export const PIN_CODE_SIZE = 4

@injectable()
export class PinCodeService implements IPinCodeService {
  @inject(ConfigSymbol) config!: IConfig
  @inject(AppConfigSymbol) appConfig!: IAppConfig

  @inject(UserSecretsEntityServiceSymbol) userSecretsEntityService!: IUserSecretsEntityService

  @inject(PinTokenServiceSymbol) tokenService!: ITokenService<IPinPayload>
  @inject(OneTimeTokenServiceSymbol) oneTimeTokenService!: ITokenService<IOneTimePayload>
  @inject(UserSecretsServiceSymbol) userSecretsService!: IUserSecretsService
  @inject(BcryptServiceSymbol) bcryptService!: IBcryptService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(PinCodeService)
  }

  private async formPassword(user: string, pin: string) {
    return user + pin
  }

  async savePinCode(user: UserModel, pin: string): Promise<void> {
    const pass = await this.formPassword(user.uid, pin)
    const hash = await this.bcryptService.hashPassword(pass)

    await this.userSecretsEntityService.updateOne({
      userId: user.id,
      pin: hash,
      pinAttempts: 0,
    })
  }

  async verifyPinCode(user: UserModel, pin: string): Promise<boolean> {
    const userSecrets = await this.userSecretsService.getUserSecrets(user.id)
    if (!userSecrets) {
      throw new Error('unexpected: user secrets record not found')
    }

    if (!userSecrets.pin || userSecrets.pin.length === 0) {
      throw new Error('unexpected: user does not have an existing pin code')
    }

    const pass = await this.formPassword(user.uid, pin)

    return await this.bcryptService.comparePassword(pass, userSecrets.pin)
  }

  async forgetPinCode(userId: number): Promise<void> {
    await this.userSecretsEntityService.updateOne({
      userId: userId,
      pin: null,
      pinAttempts: 0,
    })
  }

  async generatePinToken(user: UserModel): Promise<string> {
    const now = new Date()
    const domain = this.config.get<string>('domain')

    return this.tokenService.sign({
      user: user.uid,
      aud: [PinAccessMiddleware.AUDIENCE, domain],
      exp: addSeconds(now, 5 * 60), // 5m
      iat: now,
    })
  }

  async randomPinCode(user: UserModel): Promise<string> {
    const newPin = crypto.randomInt(10 ** PIN_CODE_SIZE)
    const result = `${newPin}`.padStart(PIN_CODE_SIZE, '0')

    await this.savePinCode(user, result)

    return result
  }

  async generateOneTimeToken(user: UserModel, action: OneTimeAction): Promise<string> {
    const now = new Date()
    const domain = this.config.get<string>('domain')

    const lifespan = OneTimeTokenLifespan[action]

    return this.oneTimeTokenService.sign({
      user: user.uid,
      action: action,

      aud: [AUDIENCE_ONE_TIME, domain],
      exp: addSeconds(now, lifespan),
      iat: now,
    })
  }

  /***
   * DISCLAIMER
   *
   * Query Driver is used here for a special case: Atomic increment.
   * Do not use this code as a template for writing queries.
   * If you believe that your case is special then discuss it before with Tech Lead
   */
  @inject(SqlQueryDriverSymbol) driver!: IQueryDriver<ISqlQuery>

  async trackPinAttempt(user: UserModel): Promise<void> {
    const maxAttempts = this.appConfig.maxPinAttempts

    await this.driver.execute({
      sql: `UPDATE "user_secrets" SET "pin_attempts" = LEAST("pin_attempts" + 1, :maxAttempts) WHERE user_id = :id;`,
      params: {
        id: user.id,
        maxAttempts: maxAttempts,
      },
    })
  }

  async resetPinAttempts(user: UserModel): Promise<void> {
    await this.userSecretsEntityService.updateOne({ userId: user.id, pinAttempts: 0 })
  }

  async validatePinAttempts(user: UserModel): Promise<void> {
    const attempts = await this.userSecretsEntityService
      .select()
      .columns(x => [x.pinAttempts])
      .where({ userId: user.id })
      .fetchScalar()

    if (attempts >= this.appConfig.maxPinAttempts) {
      throw new ForbiddenError('Max attempts exceeded')
    }
  }
}

const OneTimeTokenLifespan: Record<OneTimeAction, number> = Object.freeze({
  [OneTimeAction.DisableAppLock]: 30, // 30s
  [OneTimeAction.ChangePin]: 5 * 60, // 5m
  [OneTimeAction.CreateSellOrder]: 30, // 30s
  [OneTimeAction.CreateFundCardOrder]: 30, // 30s
  [OneTimeAction.DeleteNEOBANKAccount]: 30, // 30s
  [OneTimeAction.CreateTransferOrder]: 30, // 30s
  [OneTimeAction.UnfreezeCard]: 30, // 30s
  [OneTimeAction.CreateOnChainOrder]: 30, // 30s
})
