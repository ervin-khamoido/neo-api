2023

import { readable } from '@ts-awesome/model-reader'

import { CardBrand, CardCurrency, CardType, ICardMetadata } from './create-card.request'

// TODO: fix ALL bridgecard request/response/webhook models to not fail during binding if property does not exist
// ISSUE: some properties in **production** are missing and fail binding, e.g. pin_3ds_activated
// the values are present in sandbox, so it will be hard to catch the error before going to production
class BillingAddress {
  @readable(String) billing_address1!: string
  @readable(String) billing_city!: string
  @readable(String) billing_country!: string
  @readable(String) billing_zip_code!: string
  @readable(String) country_code!: string
  @readable(String) state!: string
}

class CardData {
  @readable(BillingAddress) billing_address!: BillingAddress
  @readable(String) brand!: CardBrand
  @readable(String) card_currency!: CardCurrency
  @readable(String) card_id!: string
  @readable(String) card_name!: string
  @readable(String) card_number!: string
  @readable(String) card_type!: CardType
  @readable(String) cardholder_id!: string
  @readable(String) cvv!: string
  @readable(String) expiry_month!: string
  @readable(String) expiry_year!: string
  @readable(String) is_active!: string
  @readable(String) issuing_app_id!: string
  @readable(String) last_4!: string
  @readable(String) livemode!: string
  @readable(String, true) pin_3ds_activated?: string | null
  @readable(String) balance!: string
  @readable(Object) meta_data!: ICardMetadata
}

export class CardDetails {
  @readable(String) status!: string
  @readable(String) message!: string
  @readable(CardData) data!: CardData
}

class CardBalanceData {
  @readable('card_id') cardId!: string
  @readable() balance!: string
}

export class CardBalance {
  @readable(String) status!: string
  @readable(String) message!: string
  @readable(CardBalanceData) data!: CardBalanceData
}
