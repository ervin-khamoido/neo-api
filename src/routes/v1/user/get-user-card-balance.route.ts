// 2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { CurrentUserSymbol } from '../../../middleware'
import { CurrencyType, UserCardModel, UserModel } from '../../../models/db'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { CardDetailsOutput, WalletBalanceOutput } from '../../../models/response'
import { IUserBalanceService, UserBalanceServiceSymbol } from '../../../services/user-balance.service'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'
import { CardServiceSymbol, ICardService } from '../../../services/dumb/card/card.service'

@httpGet('/api/v1/user/card-balance', FireAccessMiddleware(), PinAccessMiddleware)
export class GetUserCardBalanceRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService
  @inject(CardServiceSymbol) cardService!: ICardService

  @OpenApiOperationGet({
    path: '/api/v1/user/card-balance',
    description: 'Get user card balance',
    summary: 'GET user balance',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Current user card balance', content: WalletBalanceOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    let userCard: UserCardModel
    try {
      userCard = await this.cardService.getUserCard(this.user.id)
    } catch (ignore) {
      return this.json({ balance: 0, currency: CurrencyType.USD }, WalletBalanceOutput)
    }

    // 0. we decided to use the Ledger balance
    // 1. we switch to the Bridgecard's balance
    // 2. we decided to switch back to the Ledger balance
    // 3. we switch to the balance from Bridgecard
    let cardDetails: CardDetailsOutput | null = null
    try {
      cardDetails = await this.cardService.getCardDetails(this.user.id)
    } catch (ignore) {}

    const providerBalance = cardDetails?.balance
    const balance = await this.userBalanceService.getUserCardBalance(this.user.id, userCard.walletId)

    return this.json(
      { balance: providerBalance ?? Math.max(balance, 0), currency: CurrencyType.USD },
      WalletBalanceOutput,
    )
  }
}
