2021

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Card Fee output model',
})
export class CardFeeInfoOutput {
  @OpenApiSchemaProperty({
    description: 'Car fee label',
    readOnly: true,
  })
  @readable
  label!: string

  @OpenApiSchemaProperty({
    description: 'Car fee value',
    readOnly: true,
  })
  @readable
  value!: number

  @OpenApiSchemaProperty({
    description: 'Car fee value formatted',
    readOnly: true,
  })
  @readable
  valueFormatted!: string
}

@OpenApiSchema({
  description: 'Card Issue Info output model',
})
export class CardIssueInfoOutput {
  @OpenApiSchemaProperty({
    description: 'Title the user sees when the card is not issued yet',
    readOnly: true,
  })
  @readable
  title!: string

  @OpenApiSchemaProperty({
    description: 'The list of fees',
    type: OpenApiDataType.array,
    items: CardFeeInfoOutput,
    readOnly: true,
  })
  @readable([CardFeeInfoOutput])
  fees!: CardFeeInfoOutput[]

  @OpenApiSchemaProperty({
    description: 'Minimum fund amount usdc',
    readOnly: true,
  })
  @readable
  minFundAmountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Maximum fund amount usdc',
    readOnly: true,
  })
  @readable
  maxFundAmountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Maximum fund amount usdc',
    readOnly: true,
  })
  @readable
  minUnloadAmountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Maximum unload amount usdc',
    readOnly: true,
  })
  @readable
  maxUnloadAmountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Minimum required balance for issuing a card',
    readOnly: true,
  })
  @readable
  minBalanceRequired!: number
}
