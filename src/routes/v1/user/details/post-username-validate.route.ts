2021

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { SimpleValidateOutput } from '../../../../models/response/simple-validate.output'

import { RegistrationAccessMiddleware } from '../../../../middleware'
import { IUsernameService, UsernameServiceSymbol } from '../../../../services/username.service'
import { UsernameInput } from '../../../../models/request/username.input'

@httpPost('/api/v1/user/details/username/validate', RegistrationAccessMiddleware)
export class PostUsernameValidateRoute extends Route {
  @inject(UsernameServiceSymbol) usernameService!: IUsernameService

  @OpenApiOperationPost({
    path: '/api/v1/user/details/username/validate',
    description: 'Check if a username is valid',
    summary: 'POST. Check if a username is valid',
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        required: true,
        schema: UsernameInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'The validation result', content: SimpleValidateOutput },
    },
  })
  public async handle(@requestBody(UsernameInput) body: UsernameInput): Promise<void> {
    const result = await this.usernameService.validate(body.username)

    return this.json(result, SimpleValidateOutput)
  }
}
