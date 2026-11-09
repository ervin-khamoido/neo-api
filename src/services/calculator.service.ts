2021

import { injectable } from 'inversify'

import { RequestError } from '@ts-awesome/request'
import { StatusCode } from '@ts-awesome/rest'

import currency from 'currency.js'

import {
  IBuyUsdcData,
  IBuyUsdcConfig,
  IBuyUsdcCalculationsOutput,
  ISellUsdcData,
  ISellUsdcConfig,
  ISellUsdcCalculationsOutput,
  DecimalPlacesConfig,
} from '../models/calculator'
import { ICurrencyConverterConfig } from '../models/calculator/currency-converter.config'
import { CURRENCY_FORMAT_PRECISION_USDC } from '../common/constants'
import { IFeeCalculatorService } from './fee-calculator.service'
import { ACCOUNT_CONFIG } from './modern-treasury.service'

export interface ICalculatorService {
  calculateBuyUsdcTotals(
    data: IBuyUsdcData,
    config: IBuyUsdcConfig,
    feesCalculator: IFeeCalculatorService,
    includeFees: boolean,
  ): Promise<IBuyUsdcCalculationsOutput>
  calculateSellUsdcTotals(
    data: ISellUsdcData,
    config: ISellUsdcConfig,
    feesCalculator: IFeeCalculatorService,
    includeFees: boolean,
  ): Promise<ISellUsdcCalculationsOutput>
  isAmountGreaterThanLimit(amount: number, limit: number): Promise<boolean>
  convertCurrencyStringToNumber(value: string): Promise<number>
  convertCurrencyToFiat(amount: number, config: ICurrencyConverterConfig): Promise<number>
}

export const CalculatorServiceSymbol = Symbol.for('ICalculatorService')

export const FIAT_CURRENCY_PRECISION_CONFIG = new DecimalPlacesConfig(2)
export const USDC_PRECISION_CONFIG = ACCOUNT_CONFIG

const BUY_USDC_AMOUNT_PRECISION = 2
const BUY_NGN_AMOUNT_PRECISION = 2
const SELL_USDC_AMOUNT_PRECISION = 2
const SELL_NGN_AMOUNT_PRECISION = 2

/**
 * @deprecated Use CalculatorV2Service instead.
 */
@injectable()
export class CalculatorService implements ICalculatorService {
  async calculateBuyUsdcTotals(
    data: IBuyUsdcData,
    config: IBuyUsdcConfig,
    feesCalculator: IFeeCalculatorService,
    includeFees: boolean,
  ): Promise<IBuyUsdcCalculationsOutput> {
    if (!includeFees) {
      // Purchase amount = amount sent in NGN
      const purchaseAmount = currency(data.amount)

      // Total in USDC = entered amount (NGN) / exchange rate
      const totalUsdc = purchaseAmount.divide(config.exchangeRate)
      const calculatedTotalUsdc = currency(totalUsdc.value, { precision: 6 }).value

      // Calculate Fees
      const feeResult = await feesCalculator.calculate(purchaseAmount.value, config.feeConfig)

      // Total (you pay NGN) = purchase Amount + total fees
      const total = purchaseAmount.add(feeResult.total)
      const calculatedTotal = currency(total.value, { precision: CURRENCY_FORMAT_PRECISION_USDC }).value

      return {
        amount: purchaseAmount.value,
        calculatedTotal,
        calculatedTotalUsdc,
        fee: feeResult,
      }
    } else {
      throw new RequestError('Include fees feature not implemented', 'NotImplemented', StatusCode.NotImplemented)
    }
  }

  async calculateSellUsdcTotals(
    data: ISellUsdcData,
    config: ISellUsdcConfig,
    feesCalculator: IFeeCalculatorService,
    includeFees: boolean,
  ): Promise<ISellUsdcCalculationsOutput> {
    if (!includeFees) {
      // Sell amount = amount in USDC
      const sellAmount = currency(data.amountUsdc)

      // Purchase amount in NGN = sell amount (USDC) * exchange rate
      const purchaseAmount = sellAmount.multiply(config.exchangeRate)
      const calculatedPurchaseAmount = currency(purchaseAmount.value, { precision: CURRENCY_FORMAT_PRECISION_USDC })
        .value

      // Calculate Fees
      const feeResult = await feesCalculator.calculate(purchaseAmount.value, config.feeConfig)

      // Total (you get NGN) = purchase amount - total fee
      let total = purchaseAmount.subtract(feeResult.total)
      if (total.value < 0) {
        total = currency(0)
      }

      const calculatedTotal = currency(total.value, { precision: CURRENCY_FORMAT_PRECISION_USDC }).value

      return {
        amountUsdc: sellAmount.value,
        calculatedTotal,
        calculatedPurchaseAmount,
        fee: feeResult,
      }
    } else {
      throw new RequestError('Include fees feature not implemented', 'NotImplemented', StatusCode.NotImplemented)
    }
  }

  async convertCurrencyToFiat(amountUsdc: number, config: ICurrencyConverterConfig): Promise<number> {
    const amount = Math.round(
      currency(amountUsdc, { precision: 8 })
        .multiply(currency(config.exchangeRate, { precision: 4 }))
        .multiply(FIAT_CURRENCY_PRECISION_CONFIG.decimalMultiplier).value,
    )

    const convertedAmount = currency(amount, { precision: FIAT_CURRENCY_PRECISION_CONFIG.decimalPlaces }).divide(
      FIAT_CURRENCY_PRECISION_CONFIG.decimalMultiplier,
    ).value

    return convertedAmount
  }

  async isAmountGreaterThanLimit(amount: number, limit: number): Promise<boolean> {
    const currencyAmount = currency(amount, { precision: 8 })
    const currencyLimit = currency(limit, { precision: 8 })

    if (currencyAmount.value > currencyLimit.value) {
      return true
    }
    return false
  }

  async convertCurrencyStringToNumber(value: string): Promise<number> {
    return currency(value).value
  }
}

@injectable()
export class CalculatorV2Service implements ICalculatorService {
  async calculateBuyUsdcTotals(
    data: IBuyUsdcData,
    config: IBuyUsdcConfig,
    feesCalculator: IFeeCalculatorService,
    includeFees: boolean,
  ): Promise<IBuyUsdcCalculationsOutput> {
    if (!includeFees) {
      // Total in USDC = calculated on client
      // Clean the value by flooring it
      const calculatedTotalUsdc = this.floorAmount(data.totalUsdc!, BUY_USDC_AMOUNT_PRECISION)
      const amountUsdc = currency(calculatedTotalUsdc, { precision: BUY_USDC_AMOUNT_PRECISION })

      // Recalculate purchase amount due to high exchange rate factor
      // This amount will be rounded
      const amount = amountUsdc.multiply(config.exchangeRate)

      // This amount will be rounded
      const normalizedAmount = currency(amount, { precision: BUY_NGN_AMOUNT_PRECISION })

      // Calculate Fees
      const feeResult = await feesCalculator.calculate(normalizedAmount.value, config.feeConfig)

      // Total (you pay NGN) = purchase Amount + total fees
      const total = normalizedAmount.add(feeResult.total)

      return {
        amount: normalizedAmount.value,
        calculatedTotal: total.value,
        calculatedTotalUsdc: amountUsdc.value,
        fee: feeResult,
      }
    } else {
      throw new RequestError('Include fees feature not implemented', 'NotImplemented', StatusCode.NotImplemented)
    }
  }

  async calculateSellUsdcTotals(
    data: ISellUsdcData,
    config: ISellUsdcConfig,
    feesCalculator: IFeeCalculatorService,
    includeFees: boolean,
  ): Promise<ISellUsdcCalculationsOutput> {
    if (!includeFees) {
      // Sell amount = amount in USDC
      // Clean the value by flooring it
      const calculatedTotalUsdc = this.floorAmount(data.amountUsdc!, SELL_USDC_AMOUNT_PRECISION)
      const amountUsdc = currency(calculatedTotalUsdc, { precision: SELL_USDC_AMOUNT_PRECISION })

      // Purchase amount in NGN = sell amount (USDC) * exchange rate
      const amount = amountUsdc.multiply(config.exchangeRate)

      // This amount will be rounded
      const normalizedAmount = currency(amount, { precision: SELL_NGN_AMOUNT_PRECISION })

      // Calculate Fees
      const feeResult = await feesCalculator.calculate(normalizedAmount.value, config.feeConfig)

      // Total (you get NGN) = purchase amount - total fee
      let total = normalizedAmount.subtract(feeResult.total)
      if (total.value < 0) {
        total = currency(0, { precision: SELL_NGN_AMOUNT_PRECISION })
      }

      return {
        amountUsdc: amountUsdc.value,
        calculatedTotal: total.value,
        calculatedPurchaseAmount: normalizedAmount.value,
        fee: feeResult,
      }
    } else {
      throw new RequestError('Include fees feature not implemented', 'NotImplemented', StatusCode.NotImplemented)
    }
  }

  /**
   * @deprecated Use the one in utils/calculator-util in future calculator versions
   */
  private floorAmount(amount: number, decimalPlaces: number): number {
    const decimalPlacesConfig = new DecimalPlacesConfig(decimalPlaces)
    const preparedAmount = currency(amount, { precision: decimalPlaces + 2 })
    const intermidAmount = preparedAmount.multiply(decimalPlacesConfig.decimalMultiplier).dollars()
    const total = currency(intermidAmount, { precision: decimalPlaces }).divide(decimalPlacesConfig.decimalMultiplier)
      .value

    return total
  }

  // TODO: figure why we need this method
  // TODO: write unit tests
  async convertCurrencyToFiat(amountUsdc: number, config: ICurrencyConverterConfig): Promise<number> {
    const amount = Math.round(
      currency(amountUsdc, { precision: 8 })
        .multiply(currency(config.exchangeRate, { precision: 4 }))
        .multiply(FIAT_CURRENCY_PRECISION_CONFIG.decimalMultiplier).value,
    )

    const convertedAmount = currency(amount, { precision: FIAT_CURRENCY_PRECISION_CONFIG.decimalPlaces }).divide(
      FIAT_CURRENCY_PRECISION_CONFIG.decimalMultiplier,
    ).value

    return convertedAmount
  }

  // TODO: write unit tests
  async isAmountGreaterThanLimit(amount: number, limit: number): Promise<boolean> {
    const currencyAmount = currency(amount, { precision: 8 })
    const currencyLimit = currency(limit, { precision: 8 })

    if (currencyAmount.value > currencyLimit.value) {
      return true
    }

    return false
  }

  // TODO: write unit tests
  async convertCurrencyStringToNumber(value: string): Promise<number> {
    return currency(value).value
  }
}
