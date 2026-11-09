2023

import { readable } from '@ts-awesome/model-reader'

export enum FundCardResultProcess {
  Immediate,
  Delayed,
}

export interface IFundCardResult {
  processed: FundCardResultProcess
  data: FundCardData
}

enum FundCardStatus {
  Success = 'success',
}

class FundCardData {
  @readable(String) card_id!: string
  @readable(String) transaction_reference!: string
}

export class FundCardResponse {
  @readable(String, true) status?: FundCardStatus | null
  @readable(String) message!: string
  @readable(FundCardData, true) data?: FundCardData | null
}
