import { readable } from '@ts-awesome/model-reader'

export enum UnloadCardStatus {
  Success = 'success',
}

export class UnloadCardInfo {
  @readable(String) card_id!: string
  @readable(String) transaction_reference!: string
}

export class UnloadCardResponse {
  @readable(String, true) status?: UnloadCardStatus | null
  @readable(String) message!: string
  @readable(UnloadCardInfo, true) data?: UnloadCardInfo | null
}
