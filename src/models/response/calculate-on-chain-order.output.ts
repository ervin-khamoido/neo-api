2023

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { IOnChainFeeResult } from '../on-chain'

@OpenApiSchema({
  description: 'Calculate On-Chain Order Model',
})
export class CalculateOnChainOrderOutput {
  @OpenApiSchemaProperty({
    description: 'Ref  of the calculated transaction',
    readOnly: true,
  })
  @readable
  txRef!: string

  @OpenApiSchemaProperty({
    description: 'Coin - tavaxc:link, etc.',
    readOnly: true,
  })
  @readable
  coin!: string

  @OpenApiSchemaProperty({
    description: 'Base/Native coin - avaxc, tavaxc, eth etc',
    readOnly: true,
  })
  @readable
  baseCoin!: string

  @OpenApiSchemaProperty({
    description: 'Crypto address to send the funds to',
    readOnly: true,
  })
  @readable
  toAddress!: string

  @OpenApiSchemaProperty({
    description: 'Exchange rate from coin to USDC (ex: 1 AVAXC = 10 USDC)',
    readOnly: true,
  })
  @readable
  exchangeRate!: number

  @OpenApiSchemaProperty({
    description: 'Amount in USDC',
    readOnly: true,
  })
  @readable
  amountUsdc!: number

  @OpenApiSchemaProperty({
    description: 'Fee total in USDC',
    readOnly: true,
  })
  @readable(Object)
  fees!: IOnChainFeeResult

  @OpenApiSchemaProperty({
    description: 'Total USDC = Amount USDC + Fees',
    readOnly: true,
  })
  @readable
  totalUsdc!: number
}
