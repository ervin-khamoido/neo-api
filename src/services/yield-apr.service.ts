2021

import { inject, injectable } from 'inversify'
import currency from 'currency.js'

import { AppConfigSymbol, IAppConfig } from '../models/config'

import { ConfigSymbol, IConfig } from '@ts-awesome/config'
import { AirtableServiceSymbol, IAirtableService } from './airtable.service'
import { YieldAprOutput } from '../models/response'

export interface IYieldAprService {
  getAprForDate(date: Date): Promise<YieldAprOutput>
}

export const YieldAprServiceSymbol = Symbol.for('IYieldAprService')

@injectable()
export class YieldAprService implements IYieldAprService {
  @inject(AppConfigSymbol) appConfig!: IAppConfig
  @inject(ConfigSymbol) config!: IConfig

  @inject(AirtableServiceSymbol) airtableService!: IAirtableService

  async getAprForDate(date: Date): Promise<YieldAprOutput> {
    const yieldApr = await this.airtableService.getYieldAprForDate(date)
    if (!yieldApr) {
      throw new Error('Apr for the date not found')
    }

    const apr = currency(yieldApr.apr, { precision: 4 }).divide(100).value

    return {
      apr: apr,
      effectiveDate: date,
    }
  }
}
