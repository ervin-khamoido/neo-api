2023

import { CardCurrency } from './create-card.request'

export interface ICardCreationPayload {
  card_id: string
  cardholder_id: string
  currency: CardCurrency
  livemode: boolean
  issuing_app_id: string
  reason?: string
}
