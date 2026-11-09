2021

import { inject, injectable } from 'inversify'
import { CacheKey, invalidateCache } from '../../../utils/cache-util'

import {
  BankConfigEntityServiceSymbol,
  BankConfigModel,
  BankEntityServiceSymbol,
  BankModel,
  IBankConfigEntityService,
  IBankEntityService,
} from '../../../models/db'
import { IPaystackService, PaystackCountryCode, PaystackServiceSymbol } from '../../paystack.service'
import { difference } from 'lodash'
import { of } from '@ts-awesome/orm'

export interface IBankSyncResult {
  addedCount: number
  deletedCount: number
}

export interface IBankManagementService {
  syncBanks(): Promise<IBankSyncResult>
}

export const BankManagementServiceSymbol = Symbol.for('IBankManagementService')

@injectable()
export class BankManagementService implements IBankManagementService {
  @inject(BankEntityServiceSymbol) bankEntityService!: IBankEntityService
  @inject(BankConfigEntityServiceSymbol) bankConfigEntityService!: IBankConfigEntityService

  @inject(PaystackServiceSymbol) paystackService!: IPaystackService

  @invalidateCache(CacheKey.Banks)
  async syncBanks(): Promise<IBankSyncResult> {
    // get banks from Paystack
    // get banks from DB
    const [paystackBanks, banks] = await Promise.all([
      this.paystackService.getAllBanks(PaystackCountryCode.Nigeria),
      this.bankEntityService
        .select()
        .join(BankConfigModel, (root, other) => root.id.eq(other.bankId))
        .where(() => of(BankConfigModel, 'isDeleted').eq(false))
        .fetch(BankModel),
    ])

    const allBanks = paystackBanks
      .filter(pb => pb.active && !pb.isDeleted)
      .map(pb => {
        return { name: pb.name, code: pb.code }
      })

    // find ones to insert
    const toInsertBankCodes = difference(
      allBanks.map(b => b.code),
      banks.map(b => b.bankCode),
    )

    // find ones to delete
    const toDeleteBankCodes = difference(
      banks.map(b => b.bankCode),
      allBanks.map(b => b.code),
    )

    // insert
    toInsertBankCodes.forEach(async bc => {
      const bank = allBanks.find(b => b.code === bc)
      if (!bank) {
        return
      }

      await this.addBank(bank.name, bank.code)
    })

    // delete
    toDeleteBankCodes.forEach(async bc => {
      const bank = banks.find(b => b.bankCode === bc)
      if (!bank) {
        return
      }

      await this.deleteBank(bank.id)
    })

    return {
      addedCount: toInsertBankCodes.length,
      deletedCount: toDeleteBankCodes.length,
    }
  }

  private async addBank(name: string, bankCode: string): Promise<BankModel> {
    const bank = await this.bankEntityService.addOne({
      name: name,
      bankCode: bankCode,
    })

    const bankConfig = await this.bankConfigEntityService.addOne({
      bankId: bank.id,
      isDeleted: false,
    })

    return bank
  }

  private async deleteBank(id: number): Promise<void> {
    await this.bankConfigEntityService.updateOne({
      bankId: id,
      isDeleted: true,
    })
  }
}
