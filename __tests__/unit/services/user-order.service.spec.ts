2021

/* eslint-disable @typescript-eslint/no-extra-semi */

import { startOfDay, subDays } from 'date-fns'
import { NoopLoggerFactory } from '../logger.mock'
import { OrderType } from '../../../src/models/db'
import { UserOrderService } from '../../../src/services/user-order.service'

describe('UserOrderService', () => {
  const loggerFactory = NoopLoggerFactory
  let userOrderService: UserOrderService

  const getOrdersList = () => {
    return [
      {
        orderId: -1,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 0.7,
        updatedAt: new Date('2023-07-27T01:00:00'),
      },
      {
        orderId: 0,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 1.4,
        updatedAt: new Date('2023-07-30T01:00:00'),
      },
      {
        orderId: 1,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 1.234563,
        updatedAt: new Date('2023-07-31T01:00:00'),
      },
      {
        orderId: 2,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-01T01:20:00'),
      },
      {
        orderId: 3,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-02T01:20:00'),
      },
      {
        orderId: 4,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-03T01:20:00'),
      },
      {
        orderId: 5,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-04T01:20:00'),
      },
      {
        orderId: 6,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-05T01:20:00'),
      },
      {
        orderId: 7,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-06T01:20:00'),
      },
      {
        orderId: 8,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-07T01:20:00'),
      },
      {
        orderId: 9,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-08T01:20:00'),
      },
      {
        orderId: 10,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-09T01:20:00'),
      },
      {
        orderId: 11,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-10T01:20:00'),
      },
      {
        orderId: 12,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-11T01:20:00'),
      },
      {
        orderId: 13,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-12T01:20:00'),
      },
      {
        orderId: 14,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-13T01:20:00'),
      },
      {
        orderId: 15,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-14T01:20:00'),
      },
      {
        orderId: 16,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-15T01:20:00'),
      },
      {
        orderId: 17,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-16T01:20:00'),
      },
      {
        orderId: 18,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-17T01:20:00'),
      },
      {
        orderId: 19,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-18T01:20:00'),
      },
      {
        orderId: 20,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-19T01:20:00'),
      },
      {
        orderId: 21,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-20T01:20:00'),
      },
      {
        orderId: 22,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-21T01:20:00'),
      },
      {
        orderId: 23,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-22T01:20:00'),
      },
      {
        orderId: 24,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-23T01:20:00'),
      },
      {
        orderId: 25,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-24T01:20:00'),
      },
      {
        orderId: 26,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-25T01:20:00'),
      },
      {
        orderId: 27,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-26T01:20:00'),
      },
      {
        orderId: 28,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-27T01:20:00'),
      },
      {
        orderId: 29,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-28T01:20:00'),
      },
      {
        orderId: 30,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-29T01:20:00'),
      },
      {
        orderId: 31,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-30T01:20:00'),
      },
      {
        orderId: 32,
        orderType: OrderType.PurchaseOrder,
        referenceNumber: '',
        totalUsdc: 15,
        updatedAt: new Date('2023-08-31T01:20:00'),
      },
    ].map((e: any) => {
      return { ...e }
    })
  }

  beforeEach(() => {
    userOrderService = new UserOrderService(loggerFactory)
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('calculateSumOfOrdersFromDate()', () => {
    test(`Should get 0 because no orders in range`, async () => {
      const orders = getOrdersList()
      // Calculate total of array of orders from certain date
      const calculatedTotal = await userOrderService.calculateOrdersTotal(
        orders,
        startOfDay(new Date('2023-09-01T02:00:00')),
      )

      // Verify calculated total
      expect(calculatedTotal).toEqual(0)
    })
    test(`Should get the sum of orders for the last (single) date in range`, async () => {
      const orders = getOrdersList()
      // Calculate total of array of orders from certain date
      const calculatedTotal = await userOrderService.calculateOrdersTotal(
        orders,
        startOfDay(new Date('2023-08-31T23:59:59')),
      )

      // Verify calculated total
      expect(calculatedTotal).toEqual(15)
    })

    test(`Should get the sum of orders for the last 7 days`, async () => {
      const orders = getOrdersList()
      // Calculate total of array of orders from certain date
      const calculatedTotal = await userOrderService.calculateOrdersTotal(
        orders,
        subDays(startOfDay(new Date('2023-08-31T23:59:59')), 6),
      )

      // Verify calculated total
      expect(calculatedTotal).toEqual(105) // 15 * 7
    })

    test(`Should get the sum of orders for the last 30 days`, async () => {
      const orders = getOrdersList()
      // Calculate total of array of orders from certain date
      const calculatedTotal = await userOrderService.calculateOrdersTotal(
        orders,
        subDays(startOfDay(new Date('2023-08-31T23:59:59')), 29),
      )

      // Verify calculated total
      expect(calculatedTotal).toEqual(450) // 15 * 30
    })

    test(`Should get the sum of all orders`, async () => {
      const orders = getOrdersList()
      // Calculate total of array of orders from certain date
      const calculatedTotal = await userOrderService.calculateOrdersTotal(orders)

      // Verify calculated total
      expect(calculatedTotal).toEqual(468.334563)
    })
  })
})
