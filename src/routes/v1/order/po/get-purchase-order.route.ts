2021

import { inject } from 'inversify'

import { httpGet, NotFoundError, requestParam, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { UID } from '../../../../models/openapi'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'

import {
  PurchaseOrderEntityServiceSymbol,
  IPurchaseOrderEntityService,
  OrderModel,
  LPBankAccountEntityServiceSymbol,
  ILPBankAccountEntityService,
  LiquidityProviderEntityServiceSymbol,
  ILiquidityProviderEntityService,
  WalletEntityServiceSymbol,
  IWalletEntityService,
  UserBankAccountEntityServiceSymbol,
  IUserBankAccountEntityService,
} from '../../../../models/db'

import { PurchaseOrderOutput } from '../../../../models/response'
import { CurrentOrderSymbol } from '../../../../middleware'
import { OrderAccessMiddleware } from '../../../../middleware/access/order-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

@httpGet('/api/v1/order/:order/purchase', FireAccessMiddleware(), PinAccessMiddleware, OrderAccessMiddleware)
export class GetPurchaseOrderRoute extends Route {
  @inject(PurchaseOrderEntityServiceSymbol) purchaseOrderEntityService!: IPurchaseOrderEntityService
  @inject(LPBankAccountEntityServiceSymbol) lpBankAccountService!: ILPBankAccountEntityService
  @inject(LiquidityProviderEntityServiceSymbol) liquidityProviderEntityService!: ILiquidityProviderEntityService
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountService!: IUserBankAccountEntityService

  @inject(CurrentOrderSymbol) order!: OrderModel

  @OpenApiOperationGet({
    path: '/api/v1/order/{order}/purchase',
    description: 'Get purchase order details',
    summary: 'GET purchase order details',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      path: { order: UID },
    },
    responses: {
      [StatusCode.Success]: { description: 'Purchase order details', content: PurchaseOrderOutput },
      [StatusCode.NotFound]: { description: 'Purchase order not found' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
      [StatusCode.Forbidden]: { description: 'Access to Purchase order is forbidden' },
    },
  })
  public async handle(): Promise<void> {
    const purchaseOrder = await this.purchaseOrderEntityService.getOne({ orderId: this.order.id })

    if (!purchaseOrder) {
      throw new NotFoundError('Purchase order with such UID not found')
    }
    const [liquidityProvider, lpBankAccount, userBankAccount] = await Promise.all([
      this.liquidityProviderEntityService.getOne({ id: purchaseOrder.liquidityProviderId }),
      this.lpBankAccountService.getOne({ id: purchaseOrder.liquidityProviderBankAccountId }),
      this.userBankAccountService.getOne({ id: purchaseOrder.userBankAccountId }),
    ])

    const result: PurchaseOrderOutput = {
      order: this.order,
      ...purchaseOrder,
      liquidityProviderBankAccount: {
        ...lpBankAccount!,
        liquidityProvider: liquidityProvider!.uid,
      },
      liquidityProvider: liquidityProvider!.uid,
      userBankAccount: userBankAccount!.uid,
    }

    return this.json(result, PurchaseOrderOutput)
  }
}
