2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { OrderOutput } from './order.output'
import { LiquidityProviderBankAccountOutput } from './liquidity-provider-bank-account.output'

@OpenApiSchema({
  description: 'Purchase order output model',
})
export class PurchaseOrderOutput {
  @OpenApiSchemaProperty({
    description: 'Order basic info',
    type: OrderOutput,
    readOnly: true,
  })
  @readable(OrderOutput)
  order!: OrderOutput

  @OpenApiSchemaProperty({
    description: 'Purchase order expiration',
    readOnly: true,
  })
  @readable
  expiresAt!: Date

  @OpenApiSchemaProperty({
    description: 'Purchase order includes fees',
    readOnly: true,
  })
  @readable
  includeFees!: boolean

  @OpenApiSchemaProperty({
    description: 'Purchase order amount in NGN entered by user',
    readOnly: true,
  })
  @readable
  amount!: number

  @OpenApiSchemaProperty({
    description: 'Purchase order exchange rate',
    readOnly: true,
  })
  @readable
  exchangeRate!: number

  /**
   * @deprecated The property should not be used after app version 1.5.0 gets deprecated.
   */
  @OpenApiSchemaProperty({
    description: 'Purchase order fee',
    readOnly: true,
    deprecated: true,
    default: 0,
  })
  @readable(Number, true)
  fee!: number | null

  /**
   * @deprecated The property should not be used after app version 1.5.0 gets deprecated.
   */
  @OpenApiSchemaProperty({
    description: 'Purchase order agent fee',
    readOnly: true,
    deprecated: true,
    default: 0,
  })
  @readable(Number, true)
  agentFee!: number | null

  @OpenApiSchemaProperty({
    description: 'Total fee',
    readOnly: true,
  })
  @readable
  feeTotal!: number

  @OpenApiSchemaProperty({
    description: 'Total NGN the user should pay',
    readOnly: true,
  })
  @readable
  total!: number

  @OpenApiSchemaProperty({
    description: 'Total USDC user gets',
    readOnly: true,
  })
  @readable
  totalUsdc!: number

  @OpenApiSchemaProperty({
    description: 'User bank account UID',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  userBankAccount!: string

  @OpenApiSchemaProperty({
    description: 'Liquidity provider bank account',
    type: LiquidityProviderBankAccountOutput,
    readOnly: true,
  })
  @readable(LiquidityProviderBankAccountOutput)
  liquidityProviderBankAccount!: LiquidityProviderBankAccountOutput

  @OpenApiSchemaProperty({
    description: 'Liquidity provider UID',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  liquidityProvider!: string

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
