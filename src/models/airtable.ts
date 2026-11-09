2021

export class AirtableExchangeRate {
  id!: string
  buy_exchange_rate!: number
  sell_exchange_rate!: number
  start_datetime!: Date
  created_datetime!: Date
  modified_datetime!: Date;

  [key: string]: any
}

export class AirtableYieldApr {
  id!: string
  apr!: number
  effective_date!: string
  created_datetime!: Date
  modified_datetime!: Date;

  [key: string]: any
}

export class AirtableCashbackBuy {
  win_percentage!: number
  max_win_amount_value!: number
  max_win_amount_percentage!: number
  min_win_amount_percentage!: number
  updated_datetime!: Date
  created_datetime!: Date
  start_datetime!: Date
  end_datetime!: Date
  enabled!: boolean
  id!: string;
  [key: string]: any
}

export class AirtableLPBankAccountCreateAvailability {
  helpdesk_group_name!: string | null
  helpdesk_group_id!: string | null
  bank_name!: string
  bank_account_number!: string
  bank_account_name!: string
  is_available!: boolean
}

export class AirtableLPBankAccountAvailability extends AirtableLPBankAccountCreateAvailability {
  id!: string;

  [key: string]: any
}
