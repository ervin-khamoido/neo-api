2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { UserLevel, UserLevels } from '../db'

@OpenApiSchema({
  description: 'User level limit output model',
})
export class UserLevelLimitOutput {
  @OpenApiSchemaProperty({
    description: '1-day limit for buying USDC',
    type: 'number',
    nullable: true,
    readOnly: true,
  })
  @readable(Number, true)
  buy1DayLimitUsdc?: number | null

  @OpenApiSchemaProperty({
    description: '7-day limit for buying USDC',
    type: 'number',
    nullable: true,
    readOnly: true,
  })
  @readable(Number, true)
  buy7DayLimitUsdc?: number | null

  @OpenApiSchemaProperty({
    description: '30-day limit for buying USDC',
    type: 'number',
    nullable: true,
    readOnly: true,
  })
  @readable(Number, true)
  buy30DayLimitUsdc?: number | null

  @OpenApiSchemaProperty({
    description: '1-day limit for selling USDC',
    type: 'number',
    nullable: true,
    readOnly: true,
  })
  @readable(Number, true)
  sell1DayLimitUsdc?: number | null

  @OpenApiSchemaProperty({
    description: '7-day limit for selling USDC',
    type: 'number',
    nullable: true,
    readOnly: true,
  })
  @readable(Number, true)
  sell7DayLimitUsdc?: number | null

  @OpenApiSchemaProperty({
    description: '30-day limit for selling USDC',
    type: 'number',
    nullable: true,
    readOnly: true,
  })
  @readable(Number, true)
  sell30DayLimitUsdc?: number | null

  @OpenApiSchemaProperty({
    description: '1-day limit for sending USDC',
    type: 'number',
    nullable: true,
    readOnly: true,
  })
  @readable(Number, true)
  send1DayLimitUsdc?: number | null

  @OpenApiSchemaProperty({
    description: '7-day limit for sending USDC',
    type: 'number',
    nullable: true,
    readOnly: true,
  })
  @readable(Number, true)
  send7DayLimitUsdc?: number | null

  @OpenApiSchemaProperty({
    description: '30-day limit for sending USDC',
    type: 'number',
    nullable: true,
    readOnly: true,
  })
  @readable(Number, true)
  send30DayLimitUsdc?: number | null

  @OpenApiSchemaProperty({
    description: 'Combined turnover limit for receiving USDC',
    type: 'number',
    nullable: true,
    readOnly: true,
  })
  @readable(Number, true)
  combinedTurnoverLimitUsdc?: number | null
}

@OpenApiSchema({
  description: 'User current level output model',
})
export class UserLevelInfoOutput {
  @OpenApiSchemaProperty({
    description: 'User level code',
    enum: UserLevels,
    readOnly: true,
  })
  @readable
  code!: UserLevel

  @OpenApiSchemaProperty({
    description: 'User level label',
    readOnly: true,
  })
  @readable
  label!: string

  @OpenApiSchemaProperty({
    description: 'User level message',
    readOnly: true,
  })
  @readable
  message!: string
}

@OpenApiSchema({
  description: 'User current level output model',
})
export class UserCurrentLevelOutput {
  @OpenApiSchemaProperty({
    description: 'User current level code',
    type: UserLevelInfoOutput,
    enum: UserLevels,
    readOnly: true,
  })
  @readable
  current!: UserLevelInfoOutput

  @OpenApiSchemaProperty({
    description: 'User level name',
    type: UserLevelInfoOutput,
    nullable: true,
    readOnly: true,
  })
  @readable(UserLevelInfoOutput, true)
  next?: UserLevelInfoOutput | null

  @OpenApiSchemaProperty({
    description: 'User level name',
    type: UserLevelLimitOutput,
    nullable: true,
    readOnly: true,
  })
  @readable(UserLevelLimitOutput, true)
  limits?: UserLevelLimitOutput | null
}
