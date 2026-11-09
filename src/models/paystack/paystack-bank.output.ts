2023

import { readable } from '@ts-awesome/model-reader'

export class PaystackBankMeta {
  @readable('next', String, true) next?: string | null
  @readable('previous', String, true) previous?: string | null
  @readable('perPage', Number, true) perPage?: number | null
}

export class PaystackBankOutput {
  @readable('name') name!: string
  @readable('slug') slug!: string
  @readable('code') code!: string
  @readable('longcode') longcode!: string
  @readable('gateway', String, true) gateway?: string | null
  @readable('pay_with_bank') payWithBank!: boolean
  @readable('active') active!: boolean
  @readable('is_deleted') isDeleted!: boolean
  @readable('country') country!: string
  @readable('currency') currency!: string
  @readable('type') type!: string
  @readable('id') id!: number
  @readable('createdAt') createdAt!: string
  @readable('updatedAt') updatedAt!: string
}

export class PaystackBankResponse {
  @readable status!: boolean
  @readable message!: string
  @readable(Array, true) data?: [PaystackBankOutput[]] | null
  @readable(PaystackBankMeta, true) meta?: PaystackBankMeta | null
}
