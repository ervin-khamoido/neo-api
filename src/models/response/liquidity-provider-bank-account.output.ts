2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({ description: 'Liquidity provider bank account' })
export class LiquidityProviderBankAccountOutput {
  @OpenApiSchemaProperty({
    description: 'Order uid',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  uid!: string

  @OpenApiSchemaProperty({
    description: 'Liquidity provider UID',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  liquidityProvider!: string

  @OpenApiSchemaProperty({
    description: 'Liquidity provider bank account name',
    readOnly: true,
  })
  @readable
  bankName!: string

  @OpenApiSchemaProperty({
    description: 'Liquidity provider bank account number',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  bankAccountNumber!: string

  @OpenApiSchemaProperty({
    description: 'Liquidity provider bank account name',
    format: 'uuid',
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  bankAccountName?: string | null

  @OpenApiSchemaProperty({
    description: 'Created at date',
    readOnly: true,
  })
  @readable
  createdAt!: Date

  @OpenApiSchemaProperty({
    description: 'Last updated at date',
    readOnly: true,
  })
  @readable
  updatedAt!: Date
}
