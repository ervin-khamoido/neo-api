2023

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { CardBrand, CardType } from '../bridgecard'

@OpenApiSchema({
  description: 'Billing address output model',
})
class BillingAddressOutput {
  @OpenApiSchemaProperty({
    description: 'Billing address line 1',
    readOnly: true,
  })
  @readable
  address1!: string

  @OpenApiSchemaProperty({
    description: 'Billing city',
    readOnly: true,
  })
  @readable
  city!: string

  @OpenApiSchemaProperty({
    description: 'Billing country',
    readOnly: true,
  })
  @readable
  country!: string

  @OpenApiSchemaProperty({
    description: 'Billing zip code',
    readOnly: true,
  })
  @readable
  zipCode!: string

  @OpenApiSchemaProperty({
    description: 'Billing country code',
    readOnly: true,
  })
  @readable
  countryCode!: string

  @OpenApiSchemaProperty({
    description: 'Billing state',
    readOnly: true,
  })
  @readable
  state!: string
}

@OpenApiSchema({
  description: 'Card details output model',
})
export class CardDetailsOutput {
  @OpenApiSchemaProperty({
    description: 'Card number',
    readOnly: true,
  })
  @readable
  public cardNumber!: string

  @OpenApiSchemaProperty({
    description: 'Card name',
    readOnly: true,
  })
  @readable
  public cardName!: string

  @OpenApiSchemaProperty({
    description: 'CVV',
    readOnly: true,
  })
  @readable
  public cvv!: string

  @OpenApiSchemaProperty({
    description: 'Expiry month',
    readOnly: true,
  })
  @readable
  public expiryMonth!: string

  @OpenApiSchemaProperty({
    description: 'Expiry year',
    readOnly: true,
  })
  @readable
  public expiryYear!: string

  @OpenApiSchemaProperty({
    description: 'Card balance',
    readOnly: true,
  })
  @readable
  public balance!: number

  @OpenApiSchemaProperty({
    description: 'Card brand',
    readOnly: true,
  })
  @readable
  public brand!: CardBrand

  @OpenApiSchemaProperty({
    description: 'Card type',
    readOnly: true,
  })
  @readable
  public type!: CardType

  @OpenApiSchemaProperty({
    description: 'Card Billing Address',
    type: BillingAddressOutput,
    readOnly: true,
  })
  @readable(BillingAddressOutput)
  billingAddress!: BillingAddressOutput
}
