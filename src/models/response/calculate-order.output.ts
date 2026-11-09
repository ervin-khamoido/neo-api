2023

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Exchange rate Model',
})
class ExchangeRate {
  @OpenApiSchemaProperty({
    description: 'Exchange rate value',
    readOnly: true,
  })
  @readable
  public value!: number

  @OpenApiSchemaProperty({
    description: 'Formatted represetation of the exchange rate',
    readOnly: true,
  })
  @readable
  public valueFormatted!: string

  @OpenApiSchemaProperty({
    description: 'The exchange rate effective date',
    readOnly: true,
  })
  @readable(Date, true)
  public date?: Date
}

@OpenApiSchema({
  description: 'Message model',
})
class Message {
  @OpenApiSchemaProperty({
    description: 'Message',
    readOnly: true,
  })
  @readable
  public message!: string

  @OpenApiSchemaProperty({
    description: 'Message code',
    readOnly: true,
  })
  @readable
  public code!: string
}

@OpenApiSchema({
  description: 'Exchange rate',
})
class ExchangeRates {
  @OpenApiSchemaProperty({
    description: 'Exchange rate from client',
    readOnly: true,
  })
  @readable(Object)
  public client!: ExchangeRate

  @OpenApiSchemaProperty({
    description: 'Exchange rate from the server',
    readOnly: true,
  })
  @readable(Object)
  public server!: ExchangeRate
}

@OpenApiSchema({
  description: 'Key value pair, itemizeing the calculated Item',
})
class CalculatedItem {
  @OpenApiSchemaProperty({
    description: 'Field label/title',
    readOnly: true,
  })
  @readable
  label!: string

  @OpenApiSchemaProperty({
    description: 'Field Code',
    readOnly: true,
  })
  @readable
  code!: string

  @OpenApiSchemaProperty({
    description: 'Field raw value',
    readOnly: true,
    nullable: true,
  })
  @readable(Number, true)
  value?: number | null

  @OpenApiSchemaProperty({
    description: 'Field formatted value',
    readOnly: true,
  })
  @readable
  valueFormatted!: string
}

@OpenApiSchema({
  description: 'Computed Fee output model',
})
export class CalculateOrderOutput {
  @OpenApiSchemaProperty({
    description: 'Effective exchange rate',
    readOnly: true,
  })
  @readable
  public exchangeRate!: number

  @OpenApiSchemaProperty({
    description: 'Server and client exchanges rates',
    type: OpenApiDataType.object,
    readOnly: true,
  })
  @readable(ExchangeRates)
  public exchangeRates!: ExchangeRates

  @OpenApiSchemaProperty({
    description: 'A dynamic list of server calculated items',
    type: CalculatedItem,
    readOnly: true,
  })
  @readable([CalculatedItem])
  public calculatedItems!: CalculatedItem[]

  @OpenApiSchemaProperty({
    description: 'A dynamic list of server messages',
    type: Message,
    readOnly: true,
  })
  @readable([Message])
  public messages!: Message[]

  @OpenApiSchemaProperty({
    description: 'Amount from the client in USDC',
    readOnly: true,
  })
  @readable
  public amountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Amount from the client in NGN',
    readOnly: true,
  })
  @readable
  public amount!: number

  @OpenApiSchemaProperty({
    description: 'Include fees',
    readOnly: true,
  })
  @readable
  public includeFees!: boolean

  @OpenApiSchemaProperty({
    description: 'Total order fee',
    readOnly: true,
  })
  @readable
  public feeTotal!: number

  @OpenApiSchemaProperty({
    description: 'Total order amount',
    readOnly: true,
  })
  @readable
  public total!: number
}
