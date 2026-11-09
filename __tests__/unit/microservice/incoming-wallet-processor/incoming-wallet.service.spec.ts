2021

import { It, Mock } from 'moq.ts'
import { IncomingWalletService } from '../../../../src/microservice/incoming-wallet-processor/incoming-wallet.service'
import { NoopLoggerFactory } from '../../logger.mock'
import { Worker } from 'bullmq'
import { IRedisConfig } from '../../../../src/lib/models/config'
import { IReceiveMoneyBusinessService } from '../../../../src/services/business/receive/receive-money.business.service'

import * as utils from '../../../../src/utils/sleep'

describe('IncomingWalletService', () => {
  jest.spyOn(utils, 'sleep').mockImplementation(() => Promise.resolve())

  const buildJobHandler = (): [(job: any) => void, IncomingWalletService] => {
    let jobHandler = (job: { data: {} }) => {}

    const worker = new Mock<Worker<any>>()
      .setup(x => x.on(It.IsAny(), It.IsAny()))
      .returns({} as any)
      .setup(x => x.run())
      .returnsAsync({} as any)
      .setup(x => x.pause())
      .returnsAsync({} as any)
      .object()

    const workerFactory = (_: any, originalJobHandler: (job: any) => void, __: any) => {
      jobHandler = originalJobHandler

      return worker
    }

    const incomingWalletService = new IncomingWalletService(NoopLoggerFactory, workerFactory, {} as IRedisConfig)
    incomingWalletService.receiveMoneyBusinessService = new Mock<IReceiveMoneyBusinessService>()
      .setup(x => x.transferMaxFromIncomingToSaving(It.IsAny()))
      .returnsAsync()
      .setup(x => x.getUsersWithIncomingWallet(It.IsAny(), It.IsAny()))
      .returnsAsync({ cursor: null, items: [], pageSize: 10 })
      .object()

    return [jobHandler, incomingWalletService]
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('doJob() - hidden', () => {
    test(`Should process single event`, async () => {
      const [jobHandler, service] = buildJobHandler()
      const transferMaxFromIncomingToSavingSpy = jest.spyOn(
        service.receiveMoneyBusinessService,
        'transferMaxFromIncomingToSaving',
      )

      // under the covers it operates promises, so we need to await
      await jobHandler({ data: { user: '1' } })

      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenCalledTimes(1)
    })

    test(`Should not process if there are no incoming wallets`, async () => {
      const [jobHandler, service] = buildJobHandler()
      const transferMaxFromIncomingToSavingSpy = jest.spyOn(
        service.receiveMoneyBusinessService,
        'transferMaxFromIncomingToSaving',
      )

      const getUsersWithIncomingWalletSpy = jest
        .spyOn(service.receiveMoneyBusinessService, 'getUsersWithIncomingWallet')
        .mockResolvedValue({ cursor: null, items: [], pageSize: 10 })

      // under the covers it operates promises, so we need to await
      await jobHandler({ data: {} })

      expect(getUsersWithIncomingWalletSpy).toHaveBeenCalledTimes(1)
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenCalledTimes(0)
    })

    test(`Should process all if there are incoming wallets in single page`, async () => {
      const [jobHandler, service] = buildJobHandler()
      const transferMaxFromIncomingToSavingSpy = jest.spyOn(
        service.receiveMoneyBusinessService,
        'transferMaxFromIncomingToSaving',
      )

      const getUsersWithIncomingWalletSpy = jest
        .spyOn(service.receiveMoneyBusinessService, 'getUsersWithIncomingWallet')
        .mockResolvedValue({ cursor: null, items: ['1', '2', '3'], pageSize: 10 })

      // under the covers it operates promises, so we need to await
      await jobHandler({ data: {} })

      expect(getUsersWithIncomingWalletSpy).toHaveBeenCalledTimes(1)
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenCalledTimes(3)
    })

    test(`Should process all if there are multiple pages of incoming wallets`, async () => {
      const [jobHandler, service] = buildJobHandler()
      const transferMaxFromIncomingToSavingSpy = jest.spyOn(
        service.receiveMoneyBusinessService,
        'transferMaxFromIncomingToSaving',
      )

      const getUsersWithIncomingWalletSpy = jest
        .spyOn(service.receiveMoneyBusinessService, 'getUsersWithIncomingWallet')
        .mockResolvedValueOnce({ cursor: 'a', items: ['1', '2', '3'], pageSize: 10 })
        .mockResolvedValueOnce({ cursor: 'a', items: ['4', '5', '6'], pageSize: 10 })
        .mockResolvedValueOnce({ cursor: null, items: ['7', '8', '9'], pageSize: 10 })
        // this should not be called
        .mockResolvedValueOnce({ cursor: null, items: ['10', '11', '12'], pageSize: 10 })

      // under the covers it operates promises, so we need to await
      await jobHandler({ data: {} })

      expect(getUsersWithIncomingWalletSpy).toHaveBeenCalledTimes(3) // 3 pages
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenCalledTimes(9)
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenNthCalledWith(1, '1')
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenNthCalledWith(2, '2')
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenNthCalledWith(3, '3')
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenNthCalledWith(4, '4')
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenNthCalledWith(5, '5')
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenNthCalledWith(6, '6')
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenNthCalledWith(7, '7')
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenNthCalledWith(8, '8')
      expect(transferMaxFromIncomingToSavingSpy).toHaveBeenNthCalledWith(9, '9')
    })
  })
})
