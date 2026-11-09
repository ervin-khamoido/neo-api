2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Yield balance output model',
})
export class YieldBalanceOutput {
  @OpenApiSchemaProperty({
    description: 'Yield balance',
    readOnly: true,
  })
  @readable
  public balance!: number

  @OpenApiSchemaProperty({
    description: 'Currency type',
    readOnly: true,
  })
  @readable
  public currency!: string

  @OpenApiSchemaProperty({
    description: 'Due date',
    readOnly: true,
  })
  @readable
  public dueDate!: Date
}
