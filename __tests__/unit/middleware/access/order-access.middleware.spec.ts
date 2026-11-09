import { OrderModel, UserModel } from '../../../../src/models/db'
import { OrderAccessMiddleware } from '../../../../src/middleware/access/order-access.middleware'
import { NoopLoggerFactory } from '../../logger.mock'
import { RequestError } from '@ts-awesome/rest'

describe('OrderAccessMiddleware', () => {
  let orderAccessMiddleware: OrderAccessMiddleware

  beforeEach(() => {
    orderAccessMiddleware = new OrderAccessMiddleware()
    orderAccessMiddleware.loggerFactory = NoopLoggerFactory
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('handle()', () => {
    describe('Should resolve when', () => {
      test('order.userId = user.id', async () => {
        orderAccessMiddleware.user = {
          id: 1,
        } as UserModel
        orderAccessMiddleware.order = {
          userId: 1,
        } as OrderModel

        let response = orderAccessMiddleware.handle()
        await expect(response).resolves.toBeUndefined()
      })
    })

    describe('Should throw Request Error when', () => {
      test('order is undefined', async () => {
        orderAccessMiddleware.user = {
          id: 1,
        } as UserModel

        const response = orderAccessMiddleware.handle()
        await expect(response).rejects.toThrowError(RequestError)
      })

      test('user is undefined', async () => {
        orderAccessMiddleware.order = {
          userId: 1,
        } as OrderModel

        const response = orderAccessMiddleware.handle()
        await expect(response).rejects.toThrowError(RequestError)
      })

      test('user.id != order.userId', async () => {
        orderAccessMiddleware.user = {
          id: 1,
        } as UserModel
        orderAccessMiddleware.order = {
          userId: 2,
        } as OrderModel

        const response = orderAccessMiddleware.handle()
        await expect(response).rejects.toThrowError(RequestError)
      })
    })
  })
})
