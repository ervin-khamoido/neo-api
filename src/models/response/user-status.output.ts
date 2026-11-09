2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { UserStatus } from '../db'

@OpenApiSchema({
  description: 'User status output model',
})
export class UserStatusOutput {
  @OpenApiSchemaProperty({
    description: 'Current user status',
    enum: [
      UserStatus.Active,
      UserStatus.ApprovalRequired,
      UserStatus.PinResetRequired,
      UserStatus.Blocked,
      UserStatus.DeletePending,
      UserStatus.DeleteRetention,
    ],
    readOnly: true,
  })
  @readable
  status!: UserStatus
}
