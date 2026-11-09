2023

import { readable } from '@ts-awesome/model-reader'

export enum CardType {
  Virtual = 'virtual',
  Physical = 'physical',
}

export enum CardBrand {
  Mastercard = 'Mastercard',
  Visa = 'Visa',
}

export enum CardCurrency {
  USD = 'USD',
  // We don't support NGN cards for the time being
  // Uncomment once we start supporting NGN cards
  //NGN = 'NGN',
}

export interface ICardMetadata {
  owner: string
}

export class CreateCardRequest {
  @readable(String) cardholder_id!: string
  @readable(String) card_type!: CardType
  @readable(String) card_brand!: CardBrand
  @readable(String) card_currency!: CardCurrency
  @readable(String) funding_amount?: string
  @readable(Object) meta_data!: ICardMetadata
}
