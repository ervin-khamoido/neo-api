2023

import { readable } from '@ts-awesome/model-reader'

export class DeleteCardHolderResponse {
  @readable(String) status!: string
  @readable(String) message!: string
  @readable(Object) data!: object
}
