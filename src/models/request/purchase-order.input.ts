2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'
import { IBuyUsdcCalculationsOutput } from '../calculator'

/**
 * @deprecated The model should not be used after app version 1.5.0 gets deprecated.
 */
@OpenApiSchema({
  description: 'Purchase order input model V1',
})
export class PurchaseOrderV1Input {
  @OpenApiSchemaProperty({
    description: 'Include fees',
    writeOnly: true,
  })
  @readable(Boolean, true)
  includeFees!: boolean

  @OpenApiSchemaProperty({
    description: 'Amount in NGN',
    writeOnly: true,
  })
  @readable(Number, true)
  amount!: number

  @OpenApiSchemaProperty({
    description: 'Exchange rate (USDC to NGN)',
    writeOnly: true,
  })
  @readable(Number, true)
  exchangeRate!: number

  @OpenApiSchemaProperty({
    description: 'Neo Bank fee',
    writeOnly: true,
  })
  @readable(Number, true)
  fee!: number

  @OpenApiSchemaProperty({
    description: 'Agent fee in NGN',
    writeOnly: true,
  })
  @readable(Number, true)
  agentFee!: number

  @OpenApiSchemaProperty({
    description: 'Total NGN user should pay',
    writeOnly: true,
  })
  @readable(Number, true)
  total!: number

  @OpenApiSchemaProperty({
    description: 'Total USDC the user will receive',
    writeOnly: true,
  })
  @readable(Number, true)
  totalUsdc!: number

  @OpenApiSchemaProperty({
    description: 'User bank account uid',
    writeOnly: true,
  })
  @readable(String, true)
  userBankAccount!: string
}

@OpenApiSchema({
  description: 'Purchase order input model V2',
})
export class PurchaseOrderV2Input {
  @OpenApiSchemaProperty({
    description: 'Include fees',
    writeOnly: true,
  })
  @readable(Boolean, true)
  includeFees!: boolean

  @OpenApiSchemaProperty({
    description: 'Amount in NGN',
    writeOnly: true,
  })
  @readable(Number, true)
  amount!: number

  @OpenApiSchemaProperty({
    description: 'Exchange rate (USDC to NGN)',
    writeOnly: true,
  })
  @readable(Number, true)
  exchangeRate!: number

  @OpenApiSchemaProperty({
    description: 'Neo Bank fee',
    writeOnly: true,
  })
  @readable(Number, true)
  feeTotal!: number

  @OpenApiSchemaProperty({
    description: 'Total NGN user should pay',
    writeOnly: true,
  })
  @readable(Number, true)
  total!: number

  @OpenApiSchemaProperty({
    description: 'Total USDC the user will receive',
    writeOnly: true,
  })
  @readable(Number, true)
  totalUsdc!: number

  @OpenApiSchemaProperty({
    description: 'User bank account uid',
    writeOnly: true,
  })
  @readable(String, true)
  userBankAccount!: string
}

export class ICreatePurchaseOrderInput {
  purchaseOrder!: PurchaseOrderV2Input
  calculationResult!: IBuyUsdcCalculationsOutput
}
