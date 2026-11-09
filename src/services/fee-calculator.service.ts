2021

import { inject, injectable } from 'inversify'

import currency from 'currency.js'

export interface IFeeConfig {
  percentageFee: number
  flatFee: number

  /**
   * @deprecated The property should not be used after app version 1.5.0 gets deprecated.
   */
  feeMultiplier: number
  /**
   * @deprecated The property should not be used after app version 1.5.0 gets deprecated.
   */
  agentFee: number
}

export interface IFeeResult {
  total: number
  config: IFeeConfig
}

export interface IFeeCalculatorService {
  calculate(amount: number, feeConfig: IFeeConfig): Promise<IFeeResult>
}

export const FeeCalculatorServiceSymbol = Symbol.for('IFeeCalculatorService')

/**
 * @deprecated The service should not be used after app version 1.5.0 gets deprecated.
 */
@injectable()
export class FeeCalculatorV1Service implements IFeeCalculatorService {
  async calculate(amount: number, feeConfig: IFeeConfig): Promise<IFeeResult> {
    const totalAmount = currency(amount)

    // Neobank Fee = purchase Amount * company fee multiplier
    const neobankFee = totalAmount.multiply(feeConfig.feeMultiplier)

    // neobank fee + agent fee
    const totalFee = neobankFee.add(feeConfig.agentFee)

    return {
      total: totalFee.value,
      config: feeConfig,
    }
  }
}

@injectable()
export class FeeCalculatorV2Service implements IFeeCalculatorService {
  async calculate(amount: number, feeConfig: IFeeConfig): Promise<IFeeResult> {
    const totalAmount = currency(amount)
    const flatFee = currency(feeConfig.flatFee)

    // Neobank Fee = purchase Amount * company fee multiplier
    const multiplierFee = totalAmount.multiply(feeConfig.percentageFee)

    // neobank fee + agent fee
    const totalFee = multiplierFee.value > flatFee.value ? multiplierFee : flatFee

    return {
      total: totalFee.value,
      config: feeConfig,
    }
  }
}
