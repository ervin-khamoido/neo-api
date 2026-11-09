2023

import { readable } from '@ts-awesome/model-reader'

import { CardCurrency } from './create-card.request'

class CardData {
  @readable(String) card_id!: string
  @readable(String) currency!: CardCurrency
}

export class CreateCardResponse {
  @readable(String) status!: string
  @readable(String) message!: string
  @readable(CardData) data!: CardData
}
