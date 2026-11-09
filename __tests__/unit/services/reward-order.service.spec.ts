2021

import { Mock, It, Times, IMock } from 'moq.ts'
import { NoopLoggerFactory } from '../logger.mock'

import {
  IOrderEntityService,
  IRewardOrderEntityService,
  ModernTreasuryWalletModel,
  OrderModel,
  OrderType,
  RewardOrderModel,
  RewardOrderStatus,
  RewardType,
  TransactionModel,
  TransactionStatus,
  TransactionStatusModel,
} from '../../../src/models/db'

import { AccountResponse } from '../../../src/models/modern-treasury'
import { ExchangeRateOutput } from '../../../src/models/response'
import { IActivityService } from '../../../src/services/activity/activity.service'
import { ICalculatorService } from '../../../src/services/calculator.service'
import { IExchangeRateService } from '../../../src/services/exchange-rate.service'
import { IModernTreasuryService } from '../../../src/services/modern-treasury.service'
import { IOrderConfigurationService } from '../../../src/services/order-configuration.service'
import { RewardOrderService } from '../../../src/services/reward/reward-order.service'
import { IROStatusService } from '../../../src/services/ro-status.service'
import { ITransactionService } from '../../../src/services/transaction/transaction.service'
import { IUserBalanceService } from '../../../src/services/user-balance.service'
import { IWalletService } from '../../../src/services/wallet.service'
import { RewardOrderCashbackDetails } from '../../../src/models/cashback/cashback-details'

describe('RewardOrderService', () => {
  const loggerFactory = NoopLoggerFactory
  let rewardOrderService: RewardOrderService
  let roStatusServiceMock: IMock<IROStatusService>
  let activityServiceMock: IMock<IActivityService>
  let transactionServiceMock: IMock<ITransactionService>

  // Reward Order Entity Service
  const rewardOrderEntityServiceResolver = (addOneValue: RewardOrderModel, getOnevalue: RewardOrderModel | null) =>
    new Mock<IRewardOrderEntityService>()
      .setup(x => x.getOne(It.IsAny()))
      .returnsAsync(getOnevalue)
      .setup(instance => instance.addOne(It.IsAny()))
      .returnsAsync(addOneValue)
      .object()

  // Order Entity Service
  const orderEntityServiceResolver = (addOneValue: OrderModel, getOnevalue: OrderModel | null) =>
    new Mock<IOrderEntityService>()
      .setup(x => x.getOne(It.IsAny()))
      .returnsAsync(getOnevalue)
      .setup(instance => instance.addOne(It.IsAny()))
      .returnsAsync(addOneValue)
      .object()

  beforeEach(() => {
    rewardOrderService = new RewardOrderService(loggerFactory)

    // Reward Order Status Service
    roStatusServiceMock = new Mock<IROStatusService>()
      .setup(instance => instance.created(It.IsAny(), It.IsAny()))
      .returnsAsync({
        orderId: 1,
        status: RewardOrderStatus.Created,
        statusReason: '',
        changedBy: '',
        updatedAt: new Date(),
        createdAt: new Date(),
      })
      .setup(instance => instance.failed(It.IsAny(), It.IsAny()))
      .returnsAsync({
        orderId: 1,
        status: RewardOrderStatus.Failed,
        statusReason: '',
        changedBy: '',
        updatedAt: new Date(),
        createdAt: new Date(),
      })
      .setup(instance => instance.completed(It.IsAny(), It.IsAny()))
      .returnsAsync({
        orderId: 1,
        status: RewardOrderStatus.Completed,
        statusReason: '',
        changedBy: '',
        updatedAt: new Date(),
        createdAt: new Date(),
      })
    rewardOrderService.roStatusService = roStatusServiceMock.object()

    // Activity Service
    activityServiceMock = new Mock<IActivityService>()
      .setup(instance => instance.createROActivity(It.IsAny(), It.IsAny(), It.IsAny()))
      .returnsAsync()
    rewardOrderService.activityService = activityServiceMock.object()

    // Order Configuration Service
    rewardOrderService.orderConfigurationService = new Mock<IOrderConfigurationService>()
      .setup(instance => instance.generateOrderReferenceNumber(It.IsAny()))
      .returnsAsync(It.IsAny())
      .object()

    // Wallet Service
    rewardOrderService.walletService = new Mock<IWalletService>()
      .setup(instance => instance.getMTSavingWallet(It.IsAny()))
      .returnsAsync(new ModernTreasuryWalletModel())
      .object()

    // Transaction Service
    transactionServiceMock = new Mock<ITransactionService>()
      .setup(instance => instance.createTransaction(It.IsAny()))
      .returnsAsync([new TransactionModel(), { transactionStatus: new TransactionStatusModel(), changed: true }])
      .setup(instance => instance.complete(It.IsAny()))
      .returnsAsync({ transactionStatus: new TransactionStatusModel(), changed: true })
    rewardOrderService.transactionService = transactionServiceMock.object()

    // Exchange Rate Service
    rewardOrderService.exchangeRateService = new Mock<IExchangeRateService>()
      .setup(instance => instance.getExchangeRate(It.IsAny()))
      .returnsAsync(new ExchangeRateOutput())
      .object()

    // User Balance Service
    rewardOrderService.userBalanceService = new Mock<IUserBalanceService>()
      .setup(instance => instance.notifyUserBalance(It.IsAny()))
      .returnsAsync()
      .object()

    // Calculator Service
    rewardOrderService.calculatorService = new Mock<ICalculatorService>()
      .setup(instance => instance.convertCurrencyToFiat(It.IsAny(), { exchangeRate: It.IsAny() }))
      .returnsAsync(It.IsAny())
      .object()

    // Modern Treasury Service
    rewardOrderService.modernTreasuryService = new Mock<IModernTreasuryService>()
      .setup(instance => instance.getSystemAccount(It.IsAny()))
      .returnsAsync(new AccountResponse())
      .object()
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('createRewardOrder()', () => {
    test(`Should return created order model and reward order model with successful transaction`, async () => {
      const date = new Date()
      const amount = 1.0

      const transactionStatusPending: TransactionStatusModel = {
        transactionId: 1,
        status: TransactionStatus.Pending,
        statusReason: null,
        modernTreasuryTransactionId: null,
        modernTreasuryStatus: null,
        modernTreasuryPayload: null,
        totalFees: null,
        updatedAt: date,
        createdAt: date,
      }

      const transactionStatusCompleted: TransactionStatusModel = {
        transactionId: 1,
        status: TransactionStatus.Completed,
        statusReason: null,
        modernTreasuryTransactionId: null,
        modernTreasuryStatus: null,
        modernTreasuryPayload: null,
        totalFees: null,
        updatedAt: date,
        createdAt: date,
      }

      transactionServiceMock = new Mock<ITransactionService>()
        .setup(instance => instance.createTransaction(It.IsAny()))
        .returnsAsync([new TransactionModel(), { transactionStatus: transactionStatusPending, changed: true }])
        .setup(instance => instance.complete(It.IsAny()))
        .returnsAsync({ transactionStatus: transactionStatusCompleted, changed: true })
      rewardOrderService.transactionService = transactionServiceMock.object()

      const rewardOrderModel: RewardOrderModel = {
        orderId: 1,
        title: 'title1',
        description: 'description1',
        rewardType: RewardType.Cashback_Buy,
        amountUsdc: amount,
        amount: amount * 700,
        exchangeRate: 700,
        from: 'd47a1f4a-4fc0-4697-8eb4-50731f9e4168',
        toWalletId: '58836e4d-bbfd-435a-8915-66387f7b89bd',
        updatedAt: date,
        createdAt: date,
        details: {
          config: {
            maxWinAmountPercentage: 0,
            maxWinAmountValue: 0,
            minWinAmountPercentage: 0,
            version: 'v1',
            winPercentage: 0,
            startDate: new Date(),
            endDate: new Date(),
            createdDate: new Date(),
            updatedDate: new Date(),
            enabled: false,
            externalUid: '',
          },
          calculatedWinAmountPercentage: 0,
          amount: 0,
          totalUsdc: 0,
          referenceNumber: '',
          isEligibleRandomValueGenerated: 0,
          cashbackUsdc: 0,
          version: 'v1',
        } as RewardOrderCashbackDetails,
      }
      rewardOrderService.rewardOrderEntityService = rewardOrderEntityServiceResolver(rewardOrderModel, rewardOrderModel)

      const orderModel: OrderModel = {
        id: 1,
        uid: '6f256244-ae87-4937-bdc9-8df33a42fd2b',
        userId: 1,
        orderType: OrderType.RewardOrder,
        referenceNumber: 'ro1111111111',
        updatedAt: date,
        createdAt: date,
      }
      rewardOrderService.orderEntityService = orderEntityServiceResolver(orderModel, orderModel)

      // Create reward order call
      const response = await rewardOrderService.createRewardOrder({
        user: {
          id: 1,
          uid: '934cf015-b460-4e7e-8e35-f65bd5991025',
          phone: '+2341111111111',
          email: 'fake-person@fake.co',
          fireUserId: '',
          tokenNbf: date,
          createdAt: date,
          updatedAt: date,
        },
        rewardType: RewardType.Cashback_Buy,
        amountUsdc: amount,
        title: 'title',
        description: 'description',
        details: {
          config: {
            maxWinAmountPercentage: 0,
            maxWinAmountValue: 0,
            minWinAmountPercentage: 0,
            version: 'v1',
            winPercentage: 0,
            startDate: new Date(),
            endDate: new Date(),
            createdDate: new Date(),
            updatedDate: new Date(),
            enabled: false,
            externalUid: '',
          },
          calculatedWinAmountPercentage: 0,
          amount: 0,
          totalUsdc: 0,
          referenceNumber: '',
          isEligibleRandomValueGenerated: 0,
          cashbackUsdc: 0,
          version: 'v1',
        } as RewardOrderCashbackDetails,
      })

      const [order, rewardOrder] = response

      expect(order).toBeDefined()
      expect(rewardOrder).toBeDefined()

      expect(rewardOrder.amountUsdc).toEqual(amount)

      roStatusServiceMock.verify(instance => instance.created(It.IsAny(), It.IsAny()), Times.AtLeastOnce())
      roStatusServiceMock.verify(instance => instance.completed(It.IsAny(), It.IsAny()), Times.AtLeastOnce())
      roStatusServiceMock.verify(instance => instance.failed(It.IsAny(), It.IsAny()), Times.Never())

      transactionServiceMock.verify(instance => instance.createTransaction(It.IsAny()), Times.AtLeastOnce())
      transactionServiceMock.verify(instance => instance.complete(It.IsAny()), Times.AtLeastOnce())

      activityServiceMock.verify(
        instance => instance.createROActivity(It.IsAny(), It.IsAny(), It.IsAny()),
        Times.AtLeastOnce(),
      )
    })

    test(`Should return created order model and reward order model with failed transaction`, async () => {
      const date = new Date()
      const amount = 1.0

      const transactionStatusFailed: TransactionStatusModel = {
        transactionId: 1,
        status: TransactionStatus.Failed,
        statusReason: null,
        modernTreasuryTransactionId: null,
        modernTreasuryStatus: null,
        modernTreasuryPayload: null,
        totalFees: null,
        updatedAt: date,
        createdAt: date,
      }

      transactionServiceMock = new Mock<ITransactionService>()
        .setup(instance => instance.createTransaction(It.IsAny()))
        .returnsAsync([new TransactionModel(), { transactionStatus: transactionStatusFailed, changed: true }])
      rewardOrderService.transactionService = transactionServiceMock.object()

      const title = 'title1'
      const description = 'description1'

      const rewardOrderModel: RewardOrderModel = {
        orderId: 1,
        title: title,
        description: description,
        rewardType: RewardType.Cashback_Buy,
        amountUsdc: amount,
        amount: amount * 700,
        exchangeRate: 700,
        from: 'd47a1f4a-4fc0-4697-8eb4-50731f9e4168',
        toWalletId: '58836e4d-bbfd-435a-8915-66387f7b89bd',
        updatedAt: date,
        createdAt: date,
        details: {
          config: {
            maxWinAmountPercentage: 0,
            maxWinAmountValue: 0,
            minWinAmountPercentage: 0,
            version: 'v1',
            winPercentage: 0,
            startDate: new Date(),
            endDate: new Date(),
            createdDate: new Date(),
            updatedDate: new Date(),
            enabled: false,
            externalUid: '',
          },
          calculatedWinAmountPercentage: 0,
          amount: 0,
          totalUsdc: 0,
          referenceNumber: '',
          isEligibleRandomValueGenerated: 0,
          cashbackUsdc: 0,
          version: 'v1',
        } as RewardOrderCashbackDetails,
      }
      rewardOrderService.rewardOrderEntityService = rewardOrderEntityServiceResolver(rewardOrderModel, rewardOrderModel)

      const orderModel: OrderModel = {
        id: 1,
        uid: '6f256244-ae87-4937-bdc9-8df33a42fd2b',
        userId: 1,
        orderType: OrderType.RewardOrder,
        referenceNumber: 'ro1111111111',
        updatedAt: date,
        createdAt: date,
      }
      rewardOrderService.orderEntityService = orderEntityServiceResolver(orderModel, orderModel)

      // Create reward order call
      const response = await rewardOrderService.createRewardOrder({
        user: {
          id: 1,
          uid: '934cf015-b460-4e7e-8e35-f65bd5991025',
          phone: '+2341111111111',
          email: 'fake-person@fake.co',
          fireUserId: '',
          tokenNbf: date,
          createdAt: date,
          updatedAt: date,
        },
        rewardType: RewardType.Cashback_Buy,
        amountUsdc: amount,
        title: title,
        description: description,
        details: {} as RewardOrderCashbackDetails,
      })

      const [order, rewardOrder] = response

      expect(order).toBeDefined()
      expect(rewardOrder).toBeDefined()

      expect(rewardOrder.amountUsdc).toEqual(amount)

      roStatusServiceMock.verify(instance => instance.created(It.IsAny(), It.IsAny()), Times.AtLeastOnce())
      roStatusServiceMock.verify(instance => instance.completed(It.IsAny(), It.IsAny()), Times.Never())
      roStatusServiceMock.verify(instance => instance.failed(It.IsAny(), It.IsAny()), Times.AtLeastOnce())

      transactionServiceMock.verify(instance => instance.createTransaction(It.IsAny()), Times.AtLeastOnce())
      transactionServiceMock.verify(instance => instance.complete(It.IsAny()), Times.Never())

      activityServiceMock.verify(
        instance => instance.createROActivity(It.IsAny(), It.IsAny(), It.IsAny()),
        Times.Never(),
      )
    })

    test(`Should throw error if user wallet is not found`, async () => {
      const date = new Date()
      const amount = 1.0

      rewardOrderService.walletService = new Mock<IWalletService>()
        .setup(instance => instance.getMTSavingWallet(It.IsAny()))
        .returnsAsync(null)
        .object()

      // Create reward order call
      const responsePromise = rewardOrderService.createRewardOrder({
        user: {
          id: 1,
          uid: '934cf015-b460-4e7e-8e35-f65bd5991025',
          phone: '+2341111111111',
          email: 'fake-person@fake.co',
          fireUserId: '',
          tokenNbf: date,
          createdAt: date,
          updatedAt: date,
        },
        rewardType: RewardType.Cashback_Buy,
        amountUsdc: amount,
        title: 'title',
        description: 'description',
        details: {} as RewardOrderCashbackDetails,
      })

      await expect(responsePromise).rejects.toThrowError(Error)
    })

    test(`Should throw error if system wallet is not found`, async () => {
      const date = new Date()
      const amount = 1.0

      rewardOrderService.modernTreasuryService = new Mock<IModernTreasuryService>()
        .setup(instance => instance.getSystemAccount(It.IsAny()))
        .returnsAsync(null)
        .object()

      // Create reward order call
      const responsePromise = rewardOrderService.createRewardOrder({
        user: {
          id: 1,
          uid: '934cf015-b460-4e7e-8e35-f65bd5991025',
          phone: '+2341111111111',
          email: 'fake-person@fake.co',
          fireUserId: '',
          tokenNbf: date,
          createdAt: date,
          updatedAt: date,
        },
        rewardType: RewardType.Cashback_Buy,
        amountUsdc: amount,
        title: 'title',
        description: 'description',
        details: {} as RewardOrderCashbackDetails,
      })
      await expect(responsePromise).rejects.toThrowError(Error)
    })
  })
})
