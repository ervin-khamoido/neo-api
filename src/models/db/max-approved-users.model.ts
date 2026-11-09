2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('max_approved_users')
export class MaxApprovedUsersModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField
  value!: number

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const MaxApprovedUsersEntityServiceSymbol = Symbols.serviceFor(MaxApprovedUsersModel)

export interface IMaxApprovedUsersEntityService
  extends IEntityService<MaxApprovedUsersModel, 'id', 'id' | 'createdAt' | 'updatedAt', never> {}
