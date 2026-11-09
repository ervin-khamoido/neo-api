2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'

import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Liquidity Provider Bank Account HelpDesk group',
})
export class LPBankAccountGroupInput {
  @OpenApiSchemaProperty({
    description: 'Group Name',
    writeOnly: true,
  })
  @readable(String)
  name!: string

  @OpenApiSchemaProperty({
    description: 'Group Description',
    writeOnly: true,
  })
  @readable(String, true)
  description?: string
}

@OpenApiSchema({
  description: 'Liquidity Provider Bank Account input model',
})
export class LiquidityProviderBankAccountInput {
  @OpenApiSchemaProperty({
    description: 'Bank Name',
    writeOnly: true,
  })
  @readable(String)
  bankName!: string

  @OpenApiSchemaProperty({
    description: 'Bank Account Number',
    writeOnly: true,
  })
  @readable(String)
  bankAccountNumber!: string

  @OpenApiSchemaProperty({
    description: 'Bank Account Name',
    writeOnly: true,
  })
  @readable(String)
  bankAccountName!: string

  @OpenApiSchemaProperty({
    description: 'HelpDesk agent group',
    writeOnly: true,
    type: LPBankAccountGroupInput,
  })
  @readable(LPBankAccountGroupInput)
  helpDeskGroup!: LPBankAccountGroupInput
}
