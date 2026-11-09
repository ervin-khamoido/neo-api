2023

import { inject, injectable } from 'inversify'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { desc } from '@ts-awesome/orm'
import { BadRequestError } from '@ts-awesome/rest'

import BigNumber from 'bignumber.js'
import { isNaN } from 'lodash'

import { cache, CacheKey } from '../../../utils/cache-util'

import {
  IOnChainExchangeRateEntityService,
  OnChainExchangeRateEntityServiceSymbol,
  OnChainExchangeRateModel,
} from '../../../models/db'
import { OperationsAudience } from '../../../models/config'
import { OnChainExchangeRateInput } from '../../../models/request'

export interface IOnChainExchangeRateService {
  getLatestExchangeRate(token: string): Promise<OnChainExchangeRateModel | null>
  addExchangeRate(payload: OnChainExchangeRateInput): Promise<OnChainExchangeRateModel>
  verifyExchangeRateAmount(amount: string): Promise<void>
}

export const OnChainExchangeRateServiceSymbol = Symbol.for('IOnChainExchangeRateService')

@injectable()
export class OnChainExchangeRateService implements IOnChainExchangeRateService {
  @inject(OnChainExchangeRateEntityServiceSymbol)
  onChainExchangeRateEntityService!: IOnChainExchangeRateEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(OnChainExchangeRateService)
  }

  @cache(CacheKey.OnChainExchangeRate)
  async getLatestExchangeRate(token: string): Promise<OnChainExchangeRateModel | null> {
    const exchangeRate = await this.onChainExchangeRateEntityService
      .select()
      .where(x => x.token.eq(token))
      .orderBy(x => [desc(x.createdAt)])
      .limit(1)
      .fetchOne(OnChainExchangeRateModel)

    return exchangeRate
  }

  async addExchangeRate(payload: OnChainExchangeRateInput): Promise<OnChainExchangeRateModel> {
    const exchangeRate = await this.onChainExchangeRateEntityService.addOne({
      exchangeRate: payload.exchangeRate,
      token: payload.token,
      createdBy: `${OperationsAudience.Retool}:${payload.agentId}`,
    })

    return exchangeRate
  }

  async verifyExchangeRateAmount(amount: string): Promise<void> {
    const value = BigNumber(amount)
    const valueNum = value.toNumber()

    if (isNaN(valueNum)) {
      this.logger.error(`Exchange rate amount is invalid [exchange rate: ${amount}]`)

      throw new BadRequestError('Amount is invalid')
    }
  }
}
