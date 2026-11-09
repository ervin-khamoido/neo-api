2021

/* eslint-disable @typescript-eslint/no-extra-semi */

import { Mock, It } from 'moq.ts'
import { NoopLoggerFactory } from '../logger.mock'

import { Currency, UserLevelLimitModel } from '../../../src/models/db'
import {
  ActionApprovalResult,
  IMaxAvailableActionLimit,
  MaxLimitReason,
  UserActionType,
} from '../../../src/models/limits'

import { UserLimitService } from '../../../src/services/user-limit.service'
import { IUserOrderService } from '../../../src/services/user-order.service'
import { IUserLevelLimitService } from '../../../src/services/user-level-limit.service'
import { IUserBalanceService } from '../../../src/services/user-balance.service'

describe('UserLimitService', () => {
  const loggerFactory = NoopLoggerFactory
  let userLimitService: UserLimitService

  beforeEach(() => {
    userLimitService = new UserLimitService(loggerFactory)

    // User Order Service
    userLimitService.userOrderService = new Mock<IUserOrderService>()
      .setup(instance => instance.getOpenAndCompletedOrdersByActionType(It.IsAny(), It.IsAny(), It.IsAny()))
      .returnsAsync([])
      .setup(instance => instance.calculateOrdersTotal(It.IsAny(), It.IsAny()))
      .returnsAsync(It.IsAny())
      .object()

    userLimitService.userLevelLimitService = new Mock<IUserLevelLimitService>()
      .setup(instance => instance.getUserLevelLimits(It.IsAny()))
      .returnsAsync(It.IsAny())
      .object()

    userLimitService.userBalanceService = new Mock<IUserBalanceService>()
      .setup(instance => instance.getUserBalance(It.IsAny()))
      .returnsAsync(It.IsAny())
      .object()
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('getMaxAvailableActionLimit()', () => {
    ;[
      {
        testNumber: 1,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [100, 300, 300],
          combinedOrderTotals: 500,
          userLevelLimit: {
            buy1DayLimitUsdc: 1000,
            buy7DayLimitUsdc: 1500,
            buy30DayLimitUsdc: 2000,
            sell1DayLimitUsdc: 500,
            sell7DayLimitUsdc: 550,
            sell30DayLimitUsdc: 600,
            combinedTurnoverLimitUsdc: 1000,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 500, reason: MaxLimitReason.CombinedTurnoverLimit },
      },
      {
        testNumber: 2,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [100],
          combinedOrderTotals: 100,
          userLevelLimit: {
            buy1DayLimitUsdc: null,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 1000,
            sell1DayLimitUsdc: 250,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: 1000,
            combinedTurnoverLimitUsdc: 1000,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 900, reason: MaxLimitReason.CombinedTurnoverLimit },
      },
      {
        testNumber: 3,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [0, 1000],
          combinedOrderTotals: 0,
          userLevelLimit: {
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 1000,
            sell7DayLimitUsdc: 1000,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 9000, reason: MaxLimitReason.ThirtyDayLimit },
      },
      {
        testNumber: 4,
        i: {
          actionType: UserActionType.SO,
          orderTotalsByDate: [0, 0, 150],
          combinedOrderTotals: 0,
          userLevelLimit: {
            buy1DayLimitUsdc: 1000,
            buy7DayLimitUsdc: 1500,
            buy30DayLimitUsdc: 2000,
            sell1DayLimitUsdc: 500,
            sell7DayLimitUsdc: 550,
            sell30DayLimitUsdc: 600,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 750,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 450, reason: MaxLimitReason.ThirtyDayLimit },
      },
      {
        testNumber: 5,
        i: {
          actionType: UserActionType.SO,
          orderTotalsByDate: [0, 100],
          combinedOrderTotals: 0,
          userLevelLimit: {
            buy1DayLimitUsdc: null,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 1000,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: 1000,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 1000,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 250, reason: MaxLimitReason.SevenDayLimit },
      },
      {
        testNumber: 6,
        i: {
          actionType: UserActionType.SO,
          orderTotalsByDate: [0, 100],
          combinedOrderTotals: 0,
          userLevelLimit: {
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 100,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 250,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 100, reason: MaxLimitReason.OneDayLimit },
      },
      {
        testNumber: 7,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [200, 200, 200],
          combinedOrderTotals: 200,
          userLevelLimit: {
            buy1DayLimitUsdc: 200,
            buy7DayLimitUsdc: 200,
            buy30DayLimitUsdc: 200,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: 200,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 0, reason: MaxLimitReason.CombinedTurnoverLimit },
      },
      {
        testNumber: 8,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [200, 200, 200],
          combinedOrderTotals: 200,
          userLevelLimit: {
            buy1DayLimitUsdc: 200,
            buy7DayLimitUsdc: 200,
            buy30DayLimitUsdc: 200,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: 300,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 0, reason: MaxLimitReason.ThirtyDayLimit },
      },
      {
        testNumber: 9,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [200, 200, 200],
          combinedOrderTotals: 200,
          userLevelLimit: {
            buy1DayLimitUsdc: 200,
            buy7DayLimitUsdc: 200,
            buy30DayLimitUsdc: 300,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: 300,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 0, reason: MaxLimitReason.SevenDayLimit },
      },
      {
        testNumber: 10,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [200, 200, 200],
          combinedOrderTotals: 200,
          userLevelLimit: {
            buy1DayLimitUsdc: 200,
            buy7DayLimitUsdc: 300,
            buy30DayLimitUsdc: 300,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: 300,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 0, reason: MaxLimitReason.OneDayLimit },
      },
      {
        testNumber: 11,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [300, 200, 200],
          combinedOrderTotals: 200,
          userLevelLimit: {
            buy1DayLimitUsdc: 200,
            buy7DayLimitUsdc: 200,
            buy30DayLimitUsdc: 200,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: 200,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 0, reason: MaxLimitReason.CombinedTurnoverLimit },
      },
      {
        testNumber: 12,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [0.7],
          combinedOrderTotals: 0,
          userLevelLimit: {
            buy1DayLimitUsdc: 2.1,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: null,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 1.4, reason: MaxLimitReason.OneDayLimit },
      },
      {
        testNumber: 13,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [0.7],
          combinedOrderTotals: 0,
          userLevelLimit: {
            buy1DayLimitUsdc: null,
            buy7DayLimitUsdc: 2.1,
            buy30DayLimitUsdc: null,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 1.4, reason: MaxLimitReason.SevenDayLimit },
      },
      {
        testNumber: 14,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [0.7],
          combinedOrderTotals: 0,
          userLevelLimit: {
            buy1DayLimitUsdc: null,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 2.1,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 1.4, reason: MaxLimitReason.ThirtyDayLimit },
      },
      {
        testNumber: 15,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [],
          combinedOrderTotals: 0.7,
          userLevelLimit: {
            buy1DayLimitUsdc: null,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: null,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: 2.1,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 1.4, reason: MaxLimitReason.CombinedTurnoverLimit },
      },
      {
        testNumber: 16,
        i: {
          actionType: UserActionType.PO,
          orderTotalsByDate: [0.752165],
          combinedOrderTotals: 0,
          userLevelLimit: {
            buy1DayLimitUsdc: 2.123452,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: null,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: null,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 1.371287, reason: MaxLimitReason.OneDayLimit },
      },
      {
        testNumber: 17,
        i: {
          actionType: UserActionType.SO,
          orderTotalsByDate: [0, 100],
          combinedOrderTotals: 0,
          userLevelLimit: {
            buy1DayLimitUsdc: null,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 1000,
            sell1DayLimitUsdc: null,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: 1000,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 75,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 75, reason: MaxLimitReason.BalanceLimit },
      },
      {
        testNumber: 18,
        i: {
          actionType: UserActionType.SO,
          orderTotalsByDate: [0, 100],
          combinedOrderTotals: 0,
          userLevelLimit: {
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 100,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 0,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 0, reason: MaxLimitReason.BalanceLimit },
      },
      {
        testNumber: 19,
        i: {
          actionType: UserActionType.Send,
          orderTotalsByDate: [0, 0, 0],
          combinedOrderTotals: 0,
          userLevelLimit: {
            send1DayLimitUsdc: 0,
            send7DayLimitUsdc: 0,
            send30DayLimitUsdc: 0,
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 100,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 100,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 0, reason: MaxLimitReason.ThirtyDayLimit },
      },
      {
        testNumber: 20,
        i: {
          actionType: UserActionType.Send,
          orderTotalsByDate: [0, 100, 100],
          combinedOrderTotals: 0,
          userLevelLimit: {
            send1DayLimitUsdc: 3000,
            send7DayLimitUsdc: 10000,
            send30DayLimitUsdc: 40000,
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 100,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 15000,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 3000, reason: MaxLimitReason.OneDayLimit },
      },
      {
        testNumber: 21,
        i: {
          actionType: UserActionType.Send,
          orderTotalsByDate: [1000, 1000, 1000],
          combinedOrderTotals: 0,
          userLevelLimit: {
            send1DayLimitUsdc: 3000,
            send7DayLimitUsdc: 10000,
            send30DayLimitUsdc: 40000,
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 100,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 15000,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 2000, reason: MaxLimitReason.OneDayLimit },
      },
      {
        testNumber: 22,
        i: {
          actionType: UserActionType.Send,
          orderTotalsByDate: [0, 100, 100],
          combinedOrderTotals: 0,
          userLevelLimit: {
            send1DayLimitUsdc: 3000,
            send7DayLimitUsdc: 10000,
            send30DayLimitUsdc: 40000,
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 100,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: null,
          },
          walletBalance: {
            balance: 500,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 500, reason: MaxLimitReason.BalanceLimit },
      },
      {
        testNumber: 23,
        i: {
          actionType: UserActionType.Receive,
          orderTotalsByDate: [0, 100, 100],
          combinedOrderTotals: 7000,
          userLevelLimit: {
            send1DayLimitUsdc: 3000,
            send7DayLimitUsdc: 10000,
            send30DayLimitUsdc: 40000,
            receive1DayLimitUsdc: null,
            receive7DayLimitUsdc: null,
            receive30DayLimitUsdc: null,
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 100,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: 100000,
          },
          walletBalance: {
            balance: 500,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 93000, reason: MaxLimitReason.CombinedTurnoverLimit },
      },
      {
        testNumber: 24,
        i: {
          actionType: UserActionType.Receive,
          orderTotalsByDate: [0, 100, 100],
          combinedOrderTotals: 100,
          userLevelLimit: {
            send1DayLimitUsdc: 3000,
            send7DayLimitUsdc: 10000,
            send30DayLimitUsdc: 40000,
            receive1DayLimitUsdc: 0,
            receive7DayLimitUsdc: 0,
            receive30DayLimitUsdc: 0,
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 100,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: 1000,
          },
          walletBalance: {
            balance: 500,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 0, reason: MaxLimitReason.ThirtyDayLimit },
      },
      {
        testNumber: 25,
        i: {
          actionType: UserActionType.Receive,
          orderTotalsByDate: [0, 100, 100],
          combinedOrderTotals: 300,
          userLevelLimit: {
            send1DayLimitUsdc: 3000,
            send7DayLimitUsdc: 10000,
            send30DayLimitUsdc: 40000,
            receive1DayLimitUsdc: null,
            receive7DayLimitUsdc: null,
            receive30DayLimitUsdc: null,
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 100,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: 1000,
          },
          walletBalance: {
            balance: 500,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 700, reason: MaxLimitReason.CombinedTurnoverLimit },
      },
      {
        testNumber: 26,
        i: {
          actionType: UserActionType.Receive,
          orderTotalsByDate: [0, 100, 100],
          combinedOrderTotals: 1000,
          userLevelLimit: {
            send1DayLimitUsdc: 3000,
            send7DayLimitUsdc: 10000,
            send30DayLimitUsdc: 40000,
            receive1DayLimitUsdc: null,
            receive7DayLimitUsdc: null,
            receive30DayLimitUsdc: null,
            buy1DayLimitUsdc: 10000,
            buy7DayLimitUsdc: null,
            buy30DayLimitUsdc: 10000,
            sell1DayLimitUsdc: 100,
            sell7DayLimitUsdc: 250,
            sell30DayLimitUsdc: null,
            combinedTurnoverLimitUsdc: 1000,
          },
          walletBalance: {
            balance: 500,
            lockVersion: 0,
            currency: Currency.USDC,
          },
        },
        o: { maxLimit: 0, reason: MaxLimitReason.CombinedTurnoverLimit },
      },
    ].forEach(t => {
      test(`Should return the MAX available limit for a specific action type and limit type. Test Number: ${t.testNumber}`, async () => {
        // Mocks
        let counter = 0
        userLimitService.userOrderService = new Mock<IUserOrderService>()
          .setup(instance => instance.getOpenAndCompletedOrdersByActionType(It.IsAny(), It.IsAny(), It.IsAny()))
          .returnsAsync([])
          .setup(instance => instance.calculateOrdersTotal(It.IsAny(), It.IsAny()))
          .callback(async () => {
            const total = t.i.orderTotalsByDate[counter]
            counter += 1

            return total
          })
          .setup(instance => instance.getSumOfOrdersForCombinedTurnover(It.IsAny()))
          .returnsAsync(t.i.combinedOrderTotals)
          .object()

        userLimitService.userLevelLimitService = new Mock<IUserLevelLimitService>()
          .setup(instance => instance.getUserLevelLimits(It.IsAny()))
          .returnsAsync(<UserLevelLimitModel>t.i.userLevelLimit)
          .object()

        userLimitService.userBalanceService = new Mock<IUserBalanceService>()
          .setup(instance => instance.getUserBalance(It.IsAny()))
          .returnsAsync(t.i.walletBalance)
          .object()

        // Get max available limit
        const userId = 1
        const maxAvailableLimit = await userLimitService.getMaxAvailableActionLimit(userId, t.i.actionType)

        expect(maxAvailableLimit).toBeDefined()

        // Verify max limit and reason are set properly
        expect(maxAvailableLimit.maxLimit).toEqual(t.o.maxLimit)
        expect(maxAvailableLimit.reason).toEqual(t.o.reason)
      })
    })
  })

  describe('getMaxAvailableActionLimits()', () => {
    test(`Should return the MAX available limits for all supported action types`, async () => {
      // Mocks
      userLimitService.userOrderService = new Mock<IUserOrderService>()
        .setup(instance => instance.getOpenAndCompletedOrdersByActionType(It.IsAny(), It.IsAny(), It.IsAny()))
        .returnsAsync([])
        .setup(instance => instance.calculateOrdersTotal(It.IsAny(), It.IsAny()))
        .returnsAsync(100)
        .setup(instance => instance.getSumOfOrdersForCombinedTurnover(It.IsAny()))
        .returnsAsync(100)
        .object()

      const userLevelLimit = {
        userLevelId: 'fake-user-level-id',
        buy1DayLimitUsdc: null,
        buy7DayLimitUsdc: 1000,
        buy30DayLimitUsdc: 1000,
        sell1DayLimitUsdc: 250,
        sell7DayLimitUsdc: null,
        sell30DayLimitUsdc: 1000,
        send1DayLimitUsdc: 3000,
        send7DayLimitUsdc: 10000,
        send30DayLimitUsdc: 40000,
        sendComplianceTransactionLimitUsdc: null,
        receive1DayLimitUsdc: null,
        receive7DayLimitUsdc: null,
        receive30DayLimitUsdc: null,
        receiveComplianceTransactionLimitUsdc: null,
        combinedTurnoverLimitUsdc: 1000,
        createdBy: 'unit-test',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      userLimitService.userLevelLimitService = new Mock<IUserLevelLimitService>()
        .setup(instance => instance.getUserLevelLimits(It.IsAny()))
        .returnsAsync(<UserLevelLimitModel>userLevelLimit)
        .object()

      userLimitService.userBalanceService = new Mock<IUserBalanceService>()
        .setup(instance => instance.getUserBalance(It.IsAny()))
        .returnsAsync({
          balance: 250,
          lockVersion: 0,
          currency: Currency.USDC,
        })
        .object()

      // Get max available limit
      const userId = 1
      const maxAvailableLimits = await userLimitService.getMaxAvailableActionLimits(userId)
      const poMaxLimit = maxAvailableLimits.find(x => x.actionType === UserActionType.PO)
      const soMaxLimit = maxAvailableLimits.find(x => x.actionType === UserActionType.SO)
      const sendMaxLimit = maxAvailableLimits.find(x => x.actionType === UserActionType.Send)
      const receiveMaxLimit = maxAvailableLimits.find(x => x.actionType === UserActionType.Receive)

      expect(poMaxLimit).toBeDefined()
      expect(soMaxLimit).toBeDefined()
      expect(sendMaxLimit).toBeDefined()
      expect(receiveMaxLimit).toBeDefined()

      // Verify PO max limit and reason are set properly
      expect(poMaxLimit?.maxLimit).toEqual(900)
      expect(poMaxLimit?.reason).toEqual(MaxLimitReason.CombinedTurnoverLimit)

      // Verify SO max limit and reason are set correctly
      expect(soMaxLimit?.maxLimit).toEqual(150)
      expect(soMaxLimit?.reason).toEqual(MaxLimitReason.OneDayLimit)

      // Verify Send max limit and reason are set correctly
      expect(sendMaxLimit?.maxLimit).toEqual(250)
      expect(sendMaxLimit?.reason).toEqual(MaxLimitReason.BalanceLimit)

      // Verify Receive max limit and reason are set correctly
      expect(receiveMaxLimit?.maxLimit).toEqual(900)
      expect(receiveMaxLimit?.reason).toEqual(MaxLimitReason.CombinedTurnoverLimit)
    })
  })

  describe('getActionApproval()', () => {
    test(`Should return whether or not the action type is approved. Test Number: 1. Expected Result: PO Action Approved`, async () => {
      // Mocks
      const maxLimit: IMaxAvailableActionLimit = {
        actionType: UserActionType.PO,
        maxLimit: 200,
        reason: MaxLimitReason.CombinedTurnoverLimit,
        lockVersion: null,
        timestamp: new Date(),
      }
      jest.spyOn(userLimitService, 'getMaxAvailableActionLimit').mockImplementation(async () => maxLimit)

      // Get action approval
      const userId = 1
      const transactionAmount = 100
      const actionApproval = await userLimitService.getActionApproval(userId, UserActionType.PO, transactionAmount)

      // Verify action approval result
      expect(actionApproval.result).toEqual(ActionApprovalResult.Approved)
      expect(actionApproval.reason).toBeNull()
      expect(actionApproval.lockVersion).toBeNull()
    })

    test(`Should return whether or not the action type is approved. Test Number: 2. Expected Result: PO Action Rejected.`, async () => {
      // Mocks
      const maxLimit: IMaxAvailableActionLimit = {
        actionType: UserActionType.PO,
        maxLimit: 200,
        reason: MaxLimitReason.CombinedTurnoverLimit,
        lockVersion: null,
        timestamp: new Date(),
      }
      jest.spyOn(userLimitService, 'getMaxAvailableActionLimit').mockImplementation(async () => maxLimit)

      // Get action approval
      const userId = 1
      const transactionAmount = 500
      const actionApproval = await userLimitService.getActionApproval(userId, UserActionType.PO, transactionAmount)

      // Verify action approval result
      expect(actionApproval.result).toEqual(ActionApprovalResult.Rejected)
      expect(actionApproval.reason).toEqual(MaxLimitReason.CombinedTurnoverLimit)
      expect(actionApproval.lockVersion).toBeNull()
    })

    test(`Should return whether or not the action type is approved. Test Number: 3. Expected Result: SO Action Approved.`, async () => {
      // Mocks
      const maxLimit: IMaxAvailableActionLimit = {
        actionType: UserActionType.SO,
        maxLimit: 50,
        reason: MaxLimitReason.OneDayLimit,
        lockVersion: 1,
        timestamp: new Date(),
      }
      jest.spyOn(userLimitService, 'getMaxAvailableActionLimit').mockImplementation(async () => maxLimit)

      // Get action approval
      const userId = 1
      const transactionAmount = 5
      const actionApproval = await userLimitService.getActionApproval(userId, UserActionType.SO, transactionAmount)

      // Verify action approval result
      expect(actionApproval.result).toEqual(ActionApprovalResult.Approved)
      expect(actionApproval.reason).toBeNull()
      expect(actionApproval.lockVersion).toEqual(1)
    })

    test(`Should return whether or not the action type is approved. Test Number: 4. Expected Result: SO Action Approved.`, async () => {
      // Mocks
      const maxLimit: IMaxAvailableActionLimit = {
        actionType: UserActionType.SO,
        maxLimit: 10,
        reason: MaxLimitReason.BalanceLimit,
        lockVersion: 1,
        timestamp: new Date(),
      }
      jest.spyOn(userLimitService, 'getMaxAvailableActionLimit').mockImplementation(async () => maxLimit)

      // Get action approval
      const userId = 1
      const transactionAmount = 10
      const actionApproval = await userLimitService.getActionApproval(userId, UserActionType.SO, transactionAmount)

      // Verify action approval result
      expect(actionApproval.result).toEqual(ActionApprovalResult.Approved)
      expect(actionApproval.reason).toBeNull()
      expect(actionApproval.lockVersion).toEqual(1)
    })

    test(`Should return whether or not the action type is approved. Test Number: 5. Expected Result: SO Action Rejected.`, async () => {
      // Mocks
      const maxLimit: IMaxAvailableActionLimit = {
        actionType: UserActionType.SO,
        maxLimit: 0,
        reason: MaxLimitReason.BalanceLimit,
        lockVersion: 1,
        timestamp: new Date(),
      }
      jest.spyOn(userLimitService, 'getMaxAvailableActionLimit').mockImplementation(async () => maxLimit)

      // Get action approval
      const userId = 1
      const transactionAmount = 10
      const actionApproval = await userLimitService.getActionApproval(userId, UserActionType.SO, transactionAmount)

      // Verify action approval result
      expect(actionApproval.result).toEqual(ActionApprovalResult.Rejected)
      expect(actionApproval.reason).toEqual(MaxLimitReason.BalanceLimit)
      expect(actionApproval.lockVersion).toEqual(1)
    })

    test(`Should return whether or not the action type is approved. Test Number: 6. Expected Result: SO Action Rejected.`, async () => {
      // Mocks
      const maxLimit: IMaxAvailableActionLimit = {
        actionType: UserActionType.SO,
        maxLimit: 2,
        reason: MaxLimitReason.BalanceLimit,
        lockVersion: 1,
        timestamp: new Date(),
      }
      jest.spyOn(userLimitService, 'getMaxAvailableActionLimit').mockImplementation(async () => maxLimit)

      // Get action approval
      const userId = 1
      const transactionAmount = 2.01
      const actionApproval = await userLimitService.getActionApproval(userId, UserActionType.SO, transactionAmount)

      // Verify action approval result
      expect(actionApproval.result).toEqual(ActionApprovalResult.Rejected)
      expect(actionApproval.reason).toEqual(MaxLimitReason.BalanceLimit)
      expect(actionApproval.lockVersion).toEqual(1)
    })

    test(`Should return whether or not the action type is approved. Test Number: 7. Expected Result: Send Action Approved.`, async () => {
      // Mocks
      const maxLimit: IMaxAvailableActionLimit = {
        actionType: UserActionType.Send,
        maxLimit: 100,
        reason: MaxLimitReason.BalanceLimit,
        lockVersion: 1,
        timestamp: new Date(),
      }
      jest.spyOn(userLimitService, 'getMaxAvailableActionLimit').mockImplementation(async () => maxLimit)

      // Get action approval
      const userId = 1
      const transactionAmount = 10
      const actionApproval = await userLimitService.getActionApproval(userId, UserActionType.Send, transactionAmount)

      // Verify action approval result
      expect(actionApproval.result).toEqual(ActionApprovalResult.Approved)
      expect(actionApproval.reason).toBeNull()
      expect(actionApproval.lockVersion).toEqual(1)
    })

    test(`Should return whether or not the action type is approved. Test Number: 8. Expected Result: Send Action Rejected.`, async () => {
      // Mocks
      const maxLimit: IMaxAvailableActionLimit = {
        actionType: UserActionType.Send,
        maxLimit: 5,
        reason: MaxLimitReason.BalanceLimit,
        lockVersion: 1,
        timestamp: new Date(),
      }
      jest.spyOn(userLimitService, 'getMaxAvailableActionLimit').mockImplementation(async () => maxLimit)

      // Get action approval
      const userId = 1
      const transactionAmount = 10
      const actionApproval = await userLimitService.getActionApproval(userId, UserActionType.Send, transactionAmount)

      // Verify action approval result
      expect(actionApproval.result).toEqual(ActionApprovalResult.Rejected)
      expect(actionApproval.reason).toEqual(MaxLimitReason.BalanceLimit)
      expect(actionApproval.lockVersion).toEqual(1)
    })

    test(`Should return whether or not the action type is approved. Test Number: 8. Expected Result: Receive Action Approved.`, async () => {
      // Mocks
      const maxLimit: IMaxAvailableActionLimit = {
        actionType: UserActionType.Receive,
        maxLimit: 100,
        reason: MaxLimitReason.CombinedTurnoverLimit,
        lockVersion: null,
        timestamp: new Date(),
      }
      jest.spyOn(userLimitService, 'getMaxAvailableActionLimit').mockImplementation(async () => maxLimit)

      // Get action approval
      const userId = 1
      const transactionAmount = 10
      const actionApproval = await userLimitService.getActionApproval(userId, UserActionType.Receive, transactionAmount)

      // Verify action approval result
      expect(actionApproval.result).toEqual(ActionApprovalResult.Approved)
      expect(actionApproval.reason).toBeNull()
      expect(actionApproval.lockVersion).toBeNull()
    })

    test(`Should return whether or not the action type is approved. Test Number: 8. Expected Result: Receive Action Rejected.`, async () => {
      // Mocks
      const maxLimit: IMaxAvailableActionLimit = {
        actionType: UserActionType.Receive,
        maxLimit: 100,
        reason: MaxLimitReason.CombinedTurnoverLimit,
        lockVersion: null,
        timestamp: new Date(),
      }
      jest.spyOn(userLimitService, 'getMaxAvailableActionLimit').mockImplementation(async () => maxLimit)

      // Get action approval
      const userId = 1
      const transactionAmount = 1000
      const actionApproval = await userLimitService.getActionApproval(userId, UserActionType.Receive, transactionAmount)

      // Verify action approval result
      expect(actionApproval.result).toEqual(ActionApprovalResult.Rejected)
      expect(actionApproval.reason).toEqual(MaxLimitReason.CombinedTurnoverLimit)
      expect(actionApproval.lockVersion).toBeNull()
    })
  })
})
