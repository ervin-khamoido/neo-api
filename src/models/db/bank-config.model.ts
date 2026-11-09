2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('bank_config')
export class BankConfigModel {
  @dbField({
    name: 'bank_id',
    primaryKey: true,
  })
  bankId!: number

  @dbField('is_deleted')
  isDeleted!: boolean

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const BankConfigEntityServiceSymbol = Symbols.serviceFor(BankConfigModel)

export interface IBankConfigEntityService
  extends IEntityService<BankConfigModel, 'bankId', 'createdAt' | 'updatedAt', never> {}
