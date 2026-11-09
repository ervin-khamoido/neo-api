2021

import { inject } from 'inversify'

import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { UID } from '../../../../models/openapi'

import { IPurchaseOrderService, PurchaseOrderServiceSymbol } from '../../../../services/purchase-order.service'

import { UserModel } from '../../../../models/db'

import { CanCreateOrderOutput } from '../../../../models/response'

import { CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

@httpGet('/api/v1/order/purchase/can-create', FireAccessMiddleware(), PinAccessMiddleware)
export class GetCanCreatePurchaseOrderRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(PurchaseOrderServiceSymbol) purchaseOrderService!: IPurchaseOrderService

  @OpenApiOperationGet({
    path: '/api/v1/order/purchase/can-create',
    description: 'Get if PO can be created',
    summary: 'GET if PO can be created',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Can create order response', content: CanCreateOrderOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const result = await this.purchaseOrderService.canCreatePurchaseOrder(this.user.id)

    return this.json(result, CanCreateOrderOutput)
  }
}
