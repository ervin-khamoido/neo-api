2021

import currency from 'currency.js'

import { DecimalPlacesConfig } from '../models/calculator'
import { USDC_PRECISION_CONFIG } from '../services/calculator.service'

/**
 * @param {number}  value - An amount to floor.
 * @param {number} decimalPlaces - A number of decimal places to floor to.
 * @returns {string} Floored amount to the specified number of decimal places.
 */
export function floorAmount(amount: number, decimalPlaces: number): number {
  const config = new DecimalPlacesConfig(decimalPlaces)

  // do not use currency here, it causes rounding whatever precision we set
  // see the unit tests
  const rawAmount = Math.trunc(amount * config.decimalMultiplier)

  const total = currency(rawAmount, { precision: config.decimalPlaces }).divide(config.decimalMultiplier).value

  return total
}

export function USDC_CURRENCY(value: number | string | currency): currency {
  return currency(value, { precision: USDC_PRECISION_CONFIG.decimalPlaces })
}
