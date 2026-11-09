2023

import { readable } from '@ts-awesome/model-reader'
import { CardCurrency } from './create-card.request'

export interface ICardTransaction {
  transactionReference: string
  cardId: string
  amount: number
  bridgecardTransactionReference: string
  transactionType: CardTransactionType
  cardholderId: string
  currency: CardCurrency
  description: string
  transactionDate: string
  transactionTimestamp: number
}

export enum CardTransactionType {
  Debit = 'DEBIT',
  Credit = 'CREDIT',
}

export enum GetCardTransactionStatus {
  Success = 'success',
}

export class CardTransactionInfo {
  @readable('card_id', String) cardId!: string
  @readable(String) amount!: string
  @readable('bridgecard_transaction_reference', String) bridgecardTransactionReference!: string
  @readable('card_transaction_type', String) transactionType!: CardTransactionType
  @readable('cardholder_id', String) cardholderId!: string
  @readable('client_transaction_reference', String) transactionReference!: string
  @readable(String) currency!: CardCurrency
  @readable(String) description!: string
  @readable('issuing_app_id', String) issuingAppId!: string
  @readable(String) livemode!: boolean
  @readable('transaction_date', String) transactionDate!: string // GMT
  @readable('transaction_timestamp', Number) transactionTimestamp!: number // GMT
  @readable('merchant_category_code', String, true) merchantCategoryCode?: string | null

  // example
  // "amount": "0",
  // "bridgecard_transaction_reference": "7832a4d6371e4643aba4aa1f3c7030ab",
  // "card_id": "70b34986c13c4026a9c1607e27eabc49",
  // "card_transaction_type": "DEBIT",
  // "cardholder_id": "d0658fedf8284207866d961e4a7083fa",
  // "client_transaction_reference": "5c3598c8152446ba8093d058d8b59a1e",
  // "currency": "USD",
  // "description": "Apple Inc. US",
  // "issuing_app_id": "842352f4-8a6f-4a19-89c6-4e8a240a2355",
  // "livemode": false,
  // "transaction_date": "2022-08-08 02:48:15",
  // "transaction_timestamp": 1659923295,
  // "merchant_category_code": "123478" || can be None
}

export class GetCardTransactionResponse {
  @readable status!: GetCardTransactionStatus
  @readable message!: string
  @readable(CardTransactionInfo) data!: CardTransactionInfo
}
