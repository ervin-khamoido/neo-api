2023

import { CardCurrency } from './create-card.request'
import { CardTransactionType } from './get-card-transaction.response'

export interface ICardReversalPayload {
  cardholder_id: string
  card_id: string
  amount: string
  interchange_fee: string
  currency: CardCurrency
  transaction_reference: string
  livemode: boolean
  transaction_date: string
  transaction_timestamp: string
  issuing_app_id: string
  card_transaction_type: CardTransactionType
}
