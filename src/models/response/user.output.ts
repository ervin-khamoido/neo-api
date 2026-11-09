2021

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { UserDetailsOutput } from './user-details.output'

@OpenApiSchema({
  description: 'User output model',
})
export class UserOutput {
  @OpenApiSchemaProperty({
    description: 'User UID',
    format: 'uuid',
    readOnly: true,
  })
  @readable
  uid!: string // uid

  @OpenApiSchemaProperty({
    description: 'Firebase user ID',
    readOnly: true,
  })
  @readable
  fireUserId!: string // firebase user id

  @OpenApiSchemaProperty({
    description: 'Phone number',
    readOnly: true,
  })
  @readable
  phone!: string

  @OpenApiSchemaProperty({
    description: 'Email',
    readOnly: true,
  })
  @readable
  email!: string

  // @OpenApiSchemaProperty({
  //   description: 'Email Verified Date',
  //   nullable: true,
  //   readOnly: true,
  // })
  // @readable(Date, true)
  // confirmedAt!: Date | null

  @OpenApiSchemaProperty({
    description: 'User details',
    type: UserDetailsOutput,
    readOnly: true,
  })
  @readable(UserDetailsOutput)
  userDetails!: UserDetailsOutput

  @OpenApiSchemaProperty({
    description: 'User creation date',
    type: 'string',
    format: 'date-time',
    readOnly: true,
  })
  @readable
  createdAt!: Date

  @OpenApiSchemaProperty({
    description: 'User update date',
    type: 'string',
    format: 'date-time',
    readOnly: true,
  })
  @readable
  updatedAt!: Date
}
