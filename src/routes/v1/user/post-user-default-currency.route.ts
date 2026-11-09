// 2021

import { inject } from 'inversify'

import { httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'

import validation from '../../../lib/utils/validation'

import { UserModel, CurrencyType } from '../../../models/db'
import { UserSettingsOutput } from '../../../models/response'
import { UserDefaultCurrencyInput } from '../../../models/request'

import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'

import { IUserSettingsService, UserSettingsServiceSymbol } from '../../../services/user-settings.service'

@httpPost('/api/v1/user/currency', FireAccessMiddleware(), PinAccessMiddleware)
export class PostUserDefaultCurrencyRoute extends Route {
  @inject(validation.symbolFor(UserDefaultCurrencyInput))
  validator!: IValidator<UserDefaultCurrencyInput>

  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService

  @OpenApiOperationPost({
    path: '/api/v1/user/currency',
    description: 'Post save user default currency',
    summary: 'POST save user default currency',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        schema: UserDefaultCurrencyInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'Updated user settings', content: UserSettingsOutput },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(UserDefaultCurrencyInput) body: UserDefaultCurrencyInput): Promise<void> {
    this.validate(this.validator, body, 'Errors: ')

    const userSettings = await this.userSettingsService.updateDefaultCurrency(this.user.id, <CurrencyType>body.currency)

    return this.json(userSettings, StatusCode.Success, UserSettingsOutput)
  }
}
