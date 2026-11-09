2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { CustomErrorOutput } from './custom-error.output'

@OpenApiSchema({
  description: 'Delete user account validation output model',
})
export class DeleteUserValidateOutput {
  @OpenApiSchemaProperty({
    description: 'True if user can delete account, otherwise false and the errors property will contain more details',
    readOnly: true,
  })
  @readable
  valid!: boolean

  @OpenApiSchemaProperty({
    description: 'The list of errors of why the user cannot delete their account',
    readOnly: true,
  })
  @readable([CustomErrorOutput], true)
  errors?: CustomErrorOutput[] | null
}
