2021

import { inject, injectable } from 'inversify'
import { desc } from '@ts-awesome/orm'

import { cache, CacheKey } from '../utils/cache-util'

import { FeeEntityServiceSymbol, FeeModel, IFeeEntityService } from '../models/db'

export interface IFeeService {
  getFees(): Promise<FeeModel | null>

  /**
   * @deprecated The method should not be used after app version 1.5.0 gets deprecated.
   */
  verifyFees(fee: number, agentFee: number): Promise<boolean>
}

export const FeeServiceSymbol = Symbol.for('IFeeService')

@injectable()
export class FeeService implements IFeeService {
  @inject(FeeEntityServiceSymbol) feeEntityService!: IFeeEntityService

  @cache(CacheKey.Fees)
  async getFees(): Promise<FeeModel | null> {
    const fees = await this.feeEntityService
      .select()
      .where(x => x.appliesAt.lte(new Date()))
      .orderBy(x => [desc(x.appliesAt)])
      .limit(1)
      .fetchOne(FeeModel)

    return fees
  }

  async verifyFees(fee: number, agentFee: number): Promise<boolean> {
    const fees = await this.getFees()

    // If the fees have changed, return false
    if (!fees || fees.companyFeeMultiplier !== fee || fees.agentFeeAmountNgn !== agentFee) {
      return false
    }

    return true
  }
}
