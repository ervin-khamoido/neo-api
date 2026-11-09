2023

import { CardCurrency } from './create-card.request'
import { CardTransactionType } from './get-card-transaction.response'

export interface ICardCreditPayload {
  cardholder_id: string
  card_id: string
  amount: string
  currency: CardCurrency
  transaction_reference: string
  livemode: boolean
  issuing_app_id: string
  card_transaction_type: CardTransactionType
}
