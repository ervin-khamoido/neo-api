import { ILoggerFactory } from '@ts-awesome/logger'
import { NoopLoggerFactory } from '../../logger.mock'
import { TransactionStatusService } from '../../../../src/services/transaction/transaction-status.service'
import { ITransactionStatusEntityService, TransactionStatus, TransactionStatusModel } from '../../../../src/models/db'
import { It, Mock } from 'moq.ts'
import { TransactionResponse } from '../../../../src/models/modern-treasury'

describe('TransactionStatusService', () => {
  let modernTreasuryTransaction: TransactionResponse
  let transactionStatusService: TransactionStatusService

  const transactionStatusEntityServiceResolver = (
    getOnevalue: TransactionStatusModel | null,
    updateOneValue: TransactionStatusModel | null,
  ) =>
    new Mock<ITransactionStatusEntityService>()
      .setup(x => x.getOne(It.IsAny()))
      .returnsAsync(getOnevalue)
      .setup(instance => instance.updateOne(It.IsAny()))
      .returnsAsync(updateOneValue)
      .object()

  beforeEach(() => {
    modernTreasuryTransaction = new TransactionResponse()
    let logger: ILoggerFactory = () => {
      return NoopLoggerFactory('')
    }
    transactionStatusService = new TransactionStatusService(logger)
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('Should not change the status and NOT fail when status did not change', () => {
    test('PENDING to PENDING', async () => {
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Pending,
      } as TransactionStatusModel

      transactionStatusService.transactionStatusEntityService = transactionStatusEntityServiceResolver(
        transactionStatusModel,
        null,
      )
      let response = await transactionStatusService.pending(1, modernTreasuryTransaction)
      expect(response.changed).toEqual(false)
    })
    test('COMPLETED to COMPLETED', async () => {
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Completed,
      } as TransactionStatusModel

      transactionStatusService.transactionStatusEntityService = transactionStatusEntityServiceResolver(
        transactionStatusModel,
        null,
      )
      let response = await transactionStatusService.completed(1)
      expect(response.changed).toEqual(false)
    })
    test('EXCEPTION to EXCEPTION', async () => {
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Exception,
      } as TransactionStatusModel

      transactionStatusService.transactionStatusEntityService = transactionStatusEntityServiceResolver(
        transactionStatusModel,
        null,
      )
      let response = await transactionStatusService.exception(1)
      expect(response.changed).toEqual(false)
    })
  })

  describe('Should throw error when', () => {
    test('CREATED to COMPLETED', async () => {
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Created,
      } as TransactionStatusModel

      transactionStatusService.getTransactionStatus = jest.fn().mockResolvedValueOnce(transactionStatusModel)

      const resultPromise = transactionStatusService.completed(1)
      await expect(resultPromise).rejects.toThrowError(Error)
    })
    test('COMPLETED to EXCEPTION', async () => {
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Completed,
      } as TransactionStatusModel

      transactionStatusService.getTransactionStatus = jest.fn().mockResolvedValueOnce(transactionStatusModel)

      const resultPromise = transactionStatusService.exception(1)
      await expect(resultPromise).rejects.toThrowError(Error)
    })
    test('COMPLETED to PENDING', async () => {
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Completed,
      } as TransactionStatusModel

      transactionStatusService.transactionStatusEntityService = transactionStatusEntityServiceResolver(
        transactionStatusModel,
        null,
      )

      const resultPromise = transactionStatusService.pending(1, modernTreasuryTransaction)
      await expect(resultPromise).rejects.toThrowError(Error)
    })
    test('PENDING to EXCEPTION', async () => {
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Pending,
      } as TransactionStatusModel

      transactionStatusService.transactionStatusEntityService = transactionStatusEntityServiceResolver(
        transactionStatusModel,
        null,
      )

      const resultPromise = transactionStatusService.exception(1)
      await expect(resultPromise).rejects.toThrowError(Error)
    })
    test('EXCEPTION to COMPLETED', async () => {
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Exception,
      } as TransactionStatusModel

      transactionStatusService.transactionStatusEntityService = transactionStatusEntityServiceResolver(
        transactionStatusModel,
        null,
      )

      const resultPromise = transactionStatusService.completed(1)
      await expect(resultPromise).rejects.toThrowError(Error)
    })
  })

  describe('Should successfully transition from', () => {
    test('CREATED to PENDING', async () => {
      let updateOneResponse = {
        status: TransactionStatus.Pending,
      } as TransactionStatusModel
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Created,
      } as TransactionStatusModel

      transactionStatusService.transactionStatusEntityService = transactionStatusEntityServiceResolver(
        transactionStatusModel,
        updateOneResponse,
      )

      let response = await transactionStatusService.pending(1, modernTreasuryTransaction)

      expect(response.changed).toEqual(true)
      expect(response.transactionStatus.status).toEqual(TransactionStatus.Pending)
    })
    test('PENDING to COMPLETED', async () => {
      let updateOneResponse = {
        status: TransactionStatus.Completed,
      } as TransactionStatusModel
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Pending,
      } as TransactionStatusModel

      transactionStatusService.transactionStatusEntityService = new Mock<ITransactionStatusEntityService>()
        .setup(instance => instance.updateOne(It.IsAny()))
        .returnsAsync(updateOneResponse)
        .object()
      jest.spyOn(transactionStatusService, 'getTransactionStatus').mockResolvedValueOnce(transactionStatusModel)

      let response = await transactionStatusService.completed(1)

      expect(response.changed).toEqual(true)
      expect(response.transactionStatus.status).toEqual(TransactionStatus.Completed)
    })
    test('CREATED to EXCEPTION', async () => {
      let updateOneResponse = {
        status: TransactionStatus.Exception,
      } as TransactionStatusModel
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Created,
      } as TransactionStatusModel

      transactionStatusService.transactionStatusEntityService = new Mock<ITransactionStatusEntityService>()
        .setup(instance => instance.updateOne(It.IsAny()))
        .returnsAsync(updateOneResponse)
        .object()
      jest.spyOn(transactionStatusService, 'getTransactionStatus').mockResolvedValueOnce(transactionStatusModel)

      let response = await transactionStatusService.exception(1)

      expect(response.changed).toEqual(true)
      expect(response.transactionStatus.status).toEqual(TransactionStatus.Exception)
    })
    test('EXCEPTION to PENDING', async () => {
      let updateOneResponse = {
        status: TransactionStatus.Pending,
      } as TransactionStatusModel
      let transactionStatusModel = {
        transactionId: 0,
        status: TransactionStatus.Exception,
      } as TransactionStatusModel

      transactionStatusService.transactionStatusEntityService = transactionStatusEntityServiceResolver(
        transactionStatusModel,
        updateOneResponse,
      )
      let response = await transactionStatusService.restorePending(1, modernTreasuryTransaction)

      expect(response.changed).toEqual(true)
      expect(response.transactionStatus.status).toEqual(TransactionStatus.Pending)
    })
  })
})
