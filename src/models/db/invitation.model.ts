2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID, DB_EMAIL } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('invitation')
export class InvitationModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ kind: DB_EMAIL, nullable: true, model: String })
  email!: string | null

  @dbField({ nullable: true, model: String })
  phone!: string | null

  @dbField()
  link!: string

  @dbField({ name: 'created_by_id' })
  createdById!: number

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const InvitationEntityServiceSymbol = Symbols.serviceFor(InvitationModel)

export interface IInvitationEntityService
  extends IEntityService<InvitationModel, 'id', 'id' | 'uid' | 'createdAt' | 'updatedAt', never> {}
