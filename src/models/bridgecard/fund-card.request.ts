2023

import { readable } from '@ts-awesome/model-reader'
import { CardCurrency } from './create-card.request'

export class FundCardRequest {
  @readable(String) card_id!: string
  /**
   * amount(in cents) */
  @readable(String) amount!: string
  @readable(String) transaction_reference!: string
  @readable(String) currency!: CardCurrency
}
