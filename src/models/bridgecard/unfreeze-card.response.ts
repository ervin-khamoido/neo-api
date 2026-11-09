2023

import { readable } from '@ts-awesome/model-reader'

class CardData {
  @readable(String) card_id!: string
}

export class UnfreezeCardResponse {
  @readable(String) status!: string
  @readable(String) message!: string
  @readable(CardData) data!: CardData
}
