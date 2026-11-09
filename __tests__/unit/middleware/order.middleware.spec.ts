2021

import { It, Mock, Times } from 'moq.ts'
import { BadRequestError, ForbiddenError, IHttpRequest, NotFoundError } from '@ts-awesome/rest'
import { SingleValidator } from '@ts-awesome/validate'
import { CurrentOrderSymbol, OrderMiddleware } from '../../../src/middleware'
import { IOrderEntityService, OrderModel, OrderType } from '../../../src/models/db'
import { Container } from 'inversify'

describe('OrderMiddleware', () => {
  let containerMock = new Mock<Container>()
    .setup(c => c.rebind(It.IsAny()))
    .returns(<any>{
      toConstantValue: (_: any) => undefined,
    })

  let container = containerMock.object()

  let request = new Mock<IHttpRequest<any>>()
    .setup(o => o.params)
    .returns({
      order: ['1'],
    })
    .setup(o => <Container>o.container)
    .returns(container)
    .object()

  const validatorResolver = (value: true | string[]) =>
    new Mock<SingleValidator<string>>()
      .setup(instance => instance.validate(It.IsAny(), It.IsAny()))
      .returns(value)
      .object()

  const orderEntityServiceResolver = (order: OrderModel | null) =>
    new Mock<IOrderEntityService>()
      .setup(async instance => instance.getOne(It.IsAny()))
      .returnsAsync(order)
      .object()

  let middleware: OrderMiddleware

  beforeEach(() => {
    middleware = new OrderMiddleware()
  })

  describe('handle()', () => {
    test('Should rebind order in container', async () => {
      const order: OrderModel = {
        id: 1,
        uid: 'a0022af5-9d48-4ff0-8f2b-41cce19c3b92',
        userId: 1,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        updatedAt: new Date(),
        createdAt: new Date(),
      }
      middleware.orderEntityService = orderEntityServiceResolver(order)
      middleware.uuidValidator = validatorResolver(true)
      let response = await middleware.handle(request)
      expect(response).toBeUndefined()
      containerMock.verify(container => container.rebind<OrderModel>(CurrentOrderSymbol), Times.Once())
    })

    describe('Should throw error when', () => {
      test('order id is not a valid uuid', async () => {
        middleware.orderEntityService = orderEntityServiceResolver(<any>undefined)
        middleware.uuidValidator = validatorResolver([''])
        let responsePromise = middleware.handle(request)
        await expect(responsePromise).rejects.toThrowError(BadRequestError)
      })

      test('when order id not found', async () => {
        middleware.uuidValidator = validatorResolver(true)
        middleware.orderEntityService = orderEntityServiceResolver(null)
        let responsePromise = middleware.handle(request)
        await expect(responsePromise).rejects.toThrowError(NotFoundError)
      })
    })
  })
})
