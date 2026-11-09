2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('test_phone_number')
export class TestPhoneNumberModel {
  @dbField({ primaryKey: true })
  phone!: string

  @dbField
  code!: string

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date
}

export const TestPhoneNumberEntityServiceSymbol = Symbols.serviceFor(TestPhoneNumberModel)

export interface ITestPhoneNumberEntityService
  extends IEntityService<TestPhoneNumberModel, 'phone', 'updatedAt' | 'createdAt', never> {}
