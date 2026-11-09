2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { DB_UID, DB_EMAIL } from '@ts-awesome/orm-pg'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('email_verification')
export class EmailVerificationModel {
  @dbField({
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number

  @dbField({ kind: DB_UID, readonly: true })
  uid!: string

  @dbField({ kind: DB_EMAIL })
  email!: string

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const EmailVerificationEntityServiceSymbol = Symbols.serviceFor(EmailVerificationModel)

export interface IEmailVerificationEntityService
  extends IEntityService<EmailVerificationModel, 'id', 'id' | 'uid' | 'createdAt' | 'updatedAt', never> {}
