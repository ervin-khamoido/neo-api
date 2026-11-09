2021

import { dbField, dbTable, reader } from '@ts-awesome/orm'
import { EntityService, IEntityService, Symbols } from '@ts-awesome/entity'
import { ISqlQuery } from '@ts-awesome/orm-pg'
import { SimpleDate } from '../../lib/models/date'

export enum UserStatus {
  Active = 'active',
  ApprovalRequired = 'approval_required',
  PinResetRequired = 'pin_reset_required',
  Blocked = 'blocked',
  DeletePending = 'delete_pending',
  DeleteRetention = 'delete_retention',
}

export const userStatusesIneligibleForUpdate = [UserStatus.DeletePending, UserStatus.DeleteRetention]
export const activeUserStatuses = [UserStatus.Active, UserStatus.PinResetRequired]

// https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes
export enum Country {
  Nigeria = 'NG',
}

export const CountryCodeToCountryName: Record<Country, string> = Object.freeze({
  [Country.Nigeria]: 'Nigeria',
})

export const Countries = Object.values(Country)

export interface IAddress {
  addressLine: string
  city: string
  state: string
  country: Country
  postalCode?: string | null
  comment?: string | null
}

@dbTable('user_details')
export class UserDetailsModel {
  @dbField({ primaryKey: true, name: 'user_id' })
  userId!: number

  @dbField({ name: 'full_name', model: String, nullable: true })
  fullName!: string | null

  /**
   * @deprecated moved to a user referrer table
   */
  @dbField({ name: 'referrer_code', model: String, nullable: true })
  referrerCode!: string | null

  /**
   * @deprecated moved to a user referrer table
   */
  @dbField({ name: 'invitation_link', model: String, nullable: true })
  invitationLink!: string | null

  @dbField({ name: 'is_approved' })
  isApproved!: boolean

  @dbField({ name: 'avatar_url', model: String, nullable: true })
  avatarUrl!: string | null

  @dbField({ name: 'user_level_id' })
  userLevelId!: string

  @dbField({ name: 'phone' })
  phone!: string

  @dbField({ name: 'email' })
  email!: string

  @dbField({ name: 'status' })
  status!: UserStatus

  @dbField({ name: 'status_reason', model: String, nullable: true })
  statusReason!: string | null

  @dbField({ name: 'first_name', model: String, nullable: true })
  firstName!: string | null

  @dbField({ name: 'middle_name', model: String, nullable: true })
  middleName!: string | null

  @dbField({ name: 'last_name', model: String, nullable: true })
  lastName!: string | null

  @dbField({ name: 'date_of_birth', model: SimpleDate, nullable: true })
  dateOfBirth!: SimpleDate | null

  @dbField({ model: String, nullable: true })
  country!: Country | null

  @dbField({ name: 'address', model: Object, nullable: true })
  address!: IAddress | null

  @dbField({ model: String, nullable: true })
  username!: string | null

  @dbField({ name: 'updated_by', model: String, nullable: true })
  updatedBy!: string | null

  @dbField({ name: 'created_at', readonly: true })
  createdAt!: Date

  @dbField({ name: 'updated_at', readonly: true })
  updatedAt!: Date
}

export const UserDetailsEntityServiceSymbol = Symbols.serviceFor(UserDetailsModel)

export interface IUserDetailsEntityService
  extends IEntityService<UserDetailsModel, 'userId', 'updatedAt' | 'createdAt', 'statusReason' | 'referrerCode'> {
  getForUpdate(userId: number): Promise<UserDetailsModel | null>
}

export class UserDetailsEntityService
  extends EntityService<
    UserDetailsModel,
    'userId',
    'updatedAt' | 'createdAt',
    'statusReason' | 'referrerCode',
    ISqlQuery
  >
  implements IUserDetailsEntityService {
  async getForUpdate(userId: number): Promise<UserDetailsModel | null> {
    const executor = this.executor.getExecutor()
    const raw = await executor.execute({
      sql: 'SELECT * FROM "user_details" WHERE user_id=:userId FOR UPDATE;',
      params: { userId },
    })
    const result = reader(raw, UserDetailsModel, false)

    return result && result.length ? result[0] : null
  }
}
