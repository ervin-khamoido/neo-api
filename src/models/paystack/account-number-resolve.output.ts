2021

import { readable } from '@ts-awesome/model-reader'

export class DataOutput {
  @readable('account_number') accountNumber!: string
  @readable('account_name') accountName!: string
  @readable('bank_id', Number, true) bankId?: number | null
}

export class AccountNumberResolveOutput {
  @readable status!: boolean
  @readable message!: string
  @readable(DataOutput, true) data?: DataOutput | null
}
