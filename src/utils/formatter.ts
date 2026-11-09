2021

import currency from 'currency.js'
import { DecimalPlacesConfig } from '../models/calculator'

const generalConfig = { decimal: '.', separator: ',', precision: 2, pattern: '! #', negativePattern: '(! #)' }
const percentConfig = { ...generalConfig, precision: 2, symbol: '%', pattern: '#!', negativePattern: '-#!' }
const naira = { symbol: '₦' }
const usdc = { symbol: '$' }
const withoutWhitespacePattern = { pattern: '!#', negativePattern: '(!#)' }

/**
 * Format an amount in NGN (Naira)
 * @param {number}  value - An amount to format.
 * @param {boolean} whitespace - Whitespace between the currency symbol and amount.
 * @param {boolean} cents - Show cents
 * @returns {string} Formatted amount in NGN (Naira)
 */
export const NGN = (value: number, whitespace = true, cents= true): string => {
  const amount = currency(value, { precision: 2 })
  const ngnConfig = { ...naira, ...generalConfig, ...(whitespace ? {} : withoutWhitespacePattern) }
  const config = amount.cents() > 0 && cents ? ngnConfig : { ...ngnConfig, precision: 0 }

  return currency(value, config).format()
}

/**
 * @param {number}  value - An amount to format.
 * @returns {string} Formatted amount in USDC
 */
export const USDC = (value: number, whitespace: boolean = true): string => {
  const amount = currency(value, { precision: 2 })
  const usdcConfig = { ...usdc, ...generalConfig, ...(whitespace ? {} : withoutWhitespacePattern) }
  const config = amount.cents() > 0 ? usdcConfig : { ...usdcConfig, precision: 0 }

  return currency(value, config).format()
}

/**
 * @param {number}  value - An amount to format.
 * @returns {string} Formatted amount without a currency symbol
 */
export const AMOUNT = (value: number): string => {
  const amount = currency(value, { precision: 2 })
  const amountConfig = { ...generalConfig, pattern: '#', negativePattern: '(#)' }
  const config = amount.cents() > 0 ? amountConfig : { ...amountConfig, precision: 0 }

  return currency(value, config).format()
}

/**
 * @param {number}  value - An amount to format. 1 represents 100%
 * @returns {string} Formatted amount in percentage
 */
export const PERCENTAGE = (value: number): string => {
  const rawPercent = currency(value, { precision: 6 }).multiply(100)
  const percent = currency(rawPercent.value, { ...percentConfig })
  const formattedPecentValue =
    percent.cents() > 0 ? percent.format() : currency(percent.dollars(), { ...percentConfig, precision: 0 }).format()

  return formattedPecentValue
}

export const formatUsdcForNotifications = (value: number, whitespace: boolean = false): string => {
  const dpConfig = new DecimalPlacesConfig(2)
  // TODO: replace this logic with the floorAmount method from the calculator-util whenever that becomes available
  const rawAmount = Math.trunc(value * dpConfig.decimalMultiplier)
  const amount = currency(rawAmount, { precision: dpConfig.decimalPlaces }).divide(dpConfig.decimalMultiplier)

  return USDC(amount.value, whitespace)
}
