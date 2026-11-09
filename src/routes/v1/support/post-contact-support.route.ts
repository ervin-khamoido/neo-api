// 2021

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'

import { CurrentUserSymbol } from '../../../middleware'
import { UserModel } from '../../../models/db'
import { SupportInput } from '../../../models/request'
import validation from '../../../lib/utils/validation'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'

import { ISupportService, SupportServiceSymbol } from '../../../services/support.service'

@httpPost('/api/v1/support/contact', FireAccessMiddleware({ skipBlockedCheck: true }))
export class PostContactSupportRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(SupportServiceSymbol) supportService!: ISupportService

  @inject(validation.symbolFor(SupportInput))
  validator!: IValidator<SupportInput>

  @OpenApiOperationPost({
    path: '/api/v1/support/contact',
    description: 'Post customer support ticket',
    summary: 'POST customer support ticket',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        schema: SupportInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Support ticket is submitted' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(SupportInput) body: SupportInput): Promise<void> {
    this.validate(this.validator, body)

    await this.supportService.createTicket(this.user, body)

    return this.empty(StatusCode.Created)
  }
}
