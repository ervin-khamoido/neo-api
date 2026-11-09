2023

import { readable } from '@ts-awesome/model-reader'

import { ICardHolderMetadata, Address } from './create-cardholder.request'

class IdentityDetails {
  @readable(Boolean) blacklisted!: boolean
  @readable(Date) date_of_birth!: Date
  @readable(String) first_name!: string
  @readable(String) last_name!: string
  @readable(String, true) gender?: string | null
  @readable(String) id_no!: string
  @readable(String) id_type!: string
  @readable(String, true) phone?: string | null
}

class CardHolderData {
  @readable(Address) address!: Address
  @readable(String) cardholder_id!: string
  @readable(Date) created_at!: Date
  @readable(String) email_address!: string
  @readable(String) first_name!: string
  @readable(String) last_name!: string
  @readable(IdentityDetails) identity_details!: IdentityDetails
  @readable(Boolean) is_active!: boolean
  @readable(Boolean) is_id_verified!: boolean
  @readable(String) issuing_app_id!: string
  @readable(String, true) phone?: string | null
  @readable(Object) meta_data!: ICardHolderMetadata
}

export class CardHolderDetails {
  @readable(String) status!: string
  @readable(String) message!: string
  @readable(CardHolderData) data!: CardHolderData
}
