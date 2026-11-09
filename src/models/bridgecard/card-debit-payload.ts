2023

import { CardCurrency } from './create-card.request'
import { CardTransactionType } from './get-card-transaction.response'

export interface ICardDebitSuccessPayload {
  cardholder_id: string
  card_id: string
  amount: string
  description: string
  currency: CardCurrency
  transaction_reference: string
  livemode: boolean
  issuing_app_id: string
  card_transaction_type: CardTransactionType
  merchant_category_code: string

  partner_interchange_fee: string
  interchange_revenue: string
}

export interface ICardDebitDeclinedPayload {
  cardholder_id: string
  card_id: string
  amount: string
  description: string
  currency: CardCurrency
  livemode: boolean
  issuing_app_id: string
  transaction_date: string
  transaction_timestamp: string
  decline_reason: string
}
