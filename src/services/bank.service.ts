2021

import { of } from '@ts-awesome/orm'
import { inject, injectable } from 'inversify'
import { cache, CacheKey } from '../utils/cache-util'

import { BankConfigModel, BankEntityServiceSymbol, BankModel, IBankEntityService } from '../models/db'

export interface IBankService {
  getBank(uid: string): Promise<BankModel | null>
  getBanks(): Promise<readonly BankModel[]>
}

export const BankServiceSymbol = Symbol.for('IBankService')

@injectable()
export class BankService implements IBankService {
  @inject(BankEntityServiceSymbol) bankEntityService!: IBankEntityService

  async getBank(uid: string): Promise<BankModel | null> {
    const bank = await this.bankEntityService
      .select()
      .join(BankConfigModel, (root, other) => root.id.eq(other.bankId))
      .where(() => of(BankConfigModel, 'isDeleted').eq(false))
      .where(x => x.uid.eq(uid))
      .fetchOne(BankModel)

    return bank
  }

  @cache(CacheKey.Banks)
  async getBanks(): Promise<readonly BankModel[]> {
    const banks = await this.bankEntityService
      .select()
      .join(BankConfigModel, (root, other) => root.id.eq(other.bankId))
      .where(() => of(BankConfigModel, 'isDeleted').eq(false))
      .fetch(BankModel)

    return banks
  }
}
