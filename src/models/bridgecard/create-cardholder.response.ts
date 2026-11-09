2023

import { readable } from '@ts-awesome/model-reader'

class CardHolderData {
  @readable(String) cardholder_id!: string
}

export class CreateCardHolderResponse {
  @readable(String) status!: string
  @readable(String) message!: string
  @readable(CardHolderData) data!: CardHolderData
}
