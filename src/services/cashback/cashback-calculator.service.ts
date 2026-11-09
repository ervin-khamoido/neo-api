import currency from 'currency.js'
import { inject, injectable } from 'inversify'
import { ICashbackCalculatorResponse } from '../../models/cashback/cashback-response'
import * as crypto from 'crypto'
import { ILogger, LoggerFactorySymbol, ILoggerFactory } from '@ts-awesome/logger'
import { USDC_PRECISION_CONFIG } from '../calculator.service'

export interface ICashbackCalculator {
  getCashbackValue(
    amountUsdc: number,
    maxCashbackPercentage: number,
    minCashbackPercentage: number,
  ): Promise<ICashbackCalculatorResponse>
  getPercentageValue(cashbackUsdc: number, totalUsdc: number): number
}

export const CashbackCalculatorSymbol = Symbol.for('ICashbackCalculator')

@injectable()
export class CashbackCalculator implements ICashbackCalculator {
  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(CashbackCalculator)
  }
  async getCashbackValue(
    amountUsdc: number,
    maxCashbackPercentage: number,
    minCashbackPercentage: number,
  ): Promise<ICashbackCalculatorResponse> {
    if (maxCashbackPercentage > 1 || minCashbackPercentage > 1) {
      throw new Error('unexpected: minCashbackPercentage and maxCashbackPercentage be between 0 and 1')
    }

    const minCashbackPercentageValue = currency(minCashbackPercentage, { precision: 4 }).multiply(100)
    const maxCashbackPercentageValue = currency(maxCashbackPercentage, { precision: 4 }).multiply(100)

    // cents() is used to get fractions part
    // dollars() is used to get integer part
    if (minCashbackPercentageValue.cents() > 0) {
      throw new Error('unexpected: minCashbackPercentage should be an integer')
    }

    if (maxCashbackPercentageValue.cents() > 0) {
      throw new Error('unexpected: maxCashbackPercentage should be an integer')
    }

    const actualCashbackPercentage = this.getActualCashbackPercentage(
      minCashbackPercentageValue.dollars(),
      maxCashbackPercentageValue.dollars(),
    )

    const cashbackPercentage = currency(actualCashbackPercentage, { precision: 2 }).divide(100)

    const cashbackUsdc = currency(amountUsdc, { precision: USDC_PRECISION_CONFIG.decimalPlaces }).multiply(
      cashbackPercentage,
    )

    return {
      cashbackUsdc: cashbackUsdc.value,
      cashbackPercentage: cashbackPercentage.value,
    }
  }

  getPercentageValue(cashbackUsdc: number, totalUsdc: number): number {
    const recalculatedPrecentage = currency(cashbackUsdc, { precision: USDC_PRECISION_CONFIG.decimalPlaces }).divide(
      totalUsdc,
    )
    const currencyFormattedPrecentage = currency(recalculatedPrecentage, { precision: 4 })

    return currencyFormattedPrecentage.value
  }

  private getActualCashbackPercentage(minCashbackPercentage: number, maxCashbackPercentage: number): number {
    if (minCashbackPercentage === maxCashbackPercentage) {
      return maxCashbackPercentage
    } else {
      // max random range is 0 - 248
      // having maxEntropy < 2 should be safe because our range should be between 0 and 100
      // the problem it solves is that if the range (max - min) = 0 then we will get min value on each run
      // if we extend the range then there are higher chanses to get min and max values
      const maxEntropy = 2
      const randomValue = crypto.randomInt(minCashbackPercentage * maxEntropy, maxCashbackPercentage * maxEntropy)
      return Math.round(randomValue / maxEntropy)
    }
  }
}
