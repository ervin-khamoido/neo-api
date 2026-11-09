2021

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { UserLevelOutput } from './user-level.output'
import { UserStatus } from '../db'

@OpenApiSchema({
  description: 'User details output model',
})
export class UserDetailsOutput {
  @OpenApiSchemaProperty({
    description: 'User full name',
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  fullName?: string | null

  @OpenApiSchemaProperty({
    description: 'User referrer code',
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  referrerCode?: string | null

  @OpenApiSchemaProperty({
    description: 'User avatar',
    type: 'string',
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  avatarUrl?: string | null

  @OpenApiSchemaProperty({
    description: 'Is user approved?',
    type: 'boolean',
    readOnly: true,
  })
  @readable
  isApproved!: boolean

  @OpenApiSchemaProperty({
    description: 'User level',
    type: UserLevelOutput,
    readOnly: true,
  })
  @readable(UserLevelOutput)
  userLevel!: UserLevelOutput

  @OpenApiSchemaProperty({
    description: 'Invitation link',
    type: OpenApiDataType.string,
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  invitationLink!: string | null

  @OpenApiSchemaProperty({
    description: 'User phone number',
    type: 'string',
    readOnly: true,
  })
  @readable
  phone!: string

  @OpenApiSchemaProperty({
    description: 'User email',
    type: 'string',
    readOnly: true,
  })
  @readable
  email!: string

  @OpenApiSchemaProperty({
    description: 'User status',
    type: 'string',
    readOnly: true,
  })
  @readable
  status!: UserStatus

  @OpenApiSchemaProperty({
    description: 'User status reason',
    type: OpenApiDataType.string,
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  statusReason!: string | null

  @OpenApiSchemaProperty({
    description: 'Username',
    type: OpenApiDataType.string,
    nullable: true,
    readOnly: true,
  })
  @readable(String, true)
  username!: string | null

  @OpenApiSchemaProperty({
    description: 'Address',
    type: OpenApiDataType.object,
    nullable: true,
    readOnly: true,
  })
  @readable(Object, true)
  address?: object | null

  @OpenApiSchemaProperty({
    description: 'User details creation date',
    type: 'string',
    format: 'date-time',
    readOnly: true,
  })
  @readable
  createdAt!: Date

  @OpenApiSchemaProperty({
    description: 'User details update date',
    type: 'string',
    format: 'date-time',
    readOnly: true,
  })
  @readable
  updatedAt!: Date
}
