2021

import { inject } from 'inversify'

import { httpGet, NotFoundError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import {
  OrderModel,
  LiquidityProviderEntityServiceSymbol,
  ILiquidityProviderEntityService,
  WalletEntityServiceSymbol,
  IWalletEntityService,
  UserBankAccountEntityServiceSymbol,
  IUserBankAccountEntityService,
  SellOrderEntityServiceSymbol,
  ISellOrderEntityService,
} from '../../../../models/db'

import { UID } from '../../../../models/openapi'
import { SellOrderOutput } from '../../../../models/response'

import { CurrentOrderSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { OrderAccessMiddleware } from '../../../../middleware/access/order-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

@httpGet('/api/v1/order/:order/sell', FireAccessMiddleware(), PinAccessMiddleware, OrderAccessMiddleware)
export class GetSellOrderRoute extends Route {
  @inject(CurrentOrderSymbol) order!: OrderModel

  @inject(SellOrderEntityServiceSymbol) sellOrderEntityService!: ISellOrderEntityService
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountService!: IUserBankAccountEntityService
  @inject(LiquidityProviderEntityServiceSymbol) liquidityProviderEntityService!: ILiquidityProviderEntityService

  @OpenApiOperationGet({
    path: '/api/v1/order/{order}/sell',
    description: 'Get sell order details',
    summary: 'GET sell order details',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      path: { order: UID },
    },
    responses: {
      [StatusCode.Success]: { description: 'Sell order details', content: SellOrderOutput },
      [StatusCode.NotFound]: { description: 'Sell order not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
      [StatusCode.Forbidden]: { description: 'Access to sell order is forbidden' },
    },
  })
  public async handle(): Promise<void> {
    const sellOrder = await this.sellOrderEntityService.getOne({ orderId: this.order.id })

    if (!sellOrder) {
      throw new NotFoundError('Sell order with such UID not found')
    }

    const [liquidityProvider, userBankAccount] = await Promise.all([
      this.liquidityProviderEntityService.getOne({ id: sellOrder.liquidityProviderId }),
      this.userBankAccountService.getOne({ id: sellOrder.userBankAccountId }),
    ])

    const result: SellOrderOutput = {
      order: this.order,
      ...sellOrder,
      liquidityProvider: liquidityProvider!.uid,
      userBankAccount: userBankAccount!.uid,
    }

    return this.json(result, SellOrderOutput)
  }
}
