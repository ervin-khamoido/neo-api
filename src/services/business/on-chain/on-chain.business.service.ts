2023

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { DuplicateValueDbError } from '@ts-awesome/orm-pg'

import { BadRequestError, ForbiddenError, GoneHttpError } from '../../../errors'

import {
  IUserCryptoWalletEntityService,
  UserCryptoWalletEntityServiceSymbol,
  CryptoAddressBlacklistEntityServiceSymbol,
  ICryptoAddressBlacklistEntityService,
  OrderModel,
} from '../../../models/db'
import { CalculateOnChainOrderInput, OnChainOrderInput } from '../../../models/request'
import { CalculateOnChainOrderOutput } from '../../../models/response'
import { IOnChainCalculationsResult } from '../../../models/on-chain'

import { IOnChainService, OnChainServiceSymbol } from '../../dumb/on-chain/on-chain.service'
import { KeyValueStorageServiceSymbol, IKeyValueStorageService } from '../../../lib/services/key-value-storage'
import { IMoneyTransferService, MoneyTransferServiceSymbol } from '../../money-transfer.service'

export interface IOnChainBusinessService {
  ensureIncomingCryptoAddressExists(userId: number): Promise<void>
  getIncomingCryptoAddress(userId: number): Promise<string | null>
  verifyCryptoAddressBlacklist(address: string): Promise<void>
  blacklistCryptoAddress(address: string, reason: string, createdBy: string): Promise<void>
  belongsCryptoAddressToNeobank(address: string): Promise<boolean>
  verifyCryptoAddress(coin: string, address: string): Promise<void>
  verifyNetworkSupport(baseCoin: string): Promise<void>
  calculateOnChainOrder(payload: CalculateOnChainOrderInput): Promise<CalculateOnChainOrderOutput>
  sendOnChain(userId: number, payload: OnChainOrderInput): Promise<OrderModel>
}

export const OnChainBusinessServiceSymbol = Symbol.for('IOnChainBusinessService')

@injectable()
export class OnChainBusinessService implements IOnChainBusinessService {
  @inject(UserCryptoWalletEntityServiceSymbol) userCryptoWalletEntityService!: IUserCryptoWalletEntityService
  @inject(CryptoAddressBlacklistEntityServiceSymbol)
  cryptoAddressBlacklistEntityService!: ICryptoAddressBlacklistEntityService

  @inject(OnChainServiceSymbol) onChainService!: IOnChainService
  @inject(KeyValueStorageServiceSymbol) keyValueStorageService!: IKeyValueStorageService
  @inject(MoneyTransferServiceSymbol) moneyTransferService!: IMoneyTransferService

  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(OnChainBusinessService)
  }

  async ensureIncomingCryptoAddressExists(userId: number): Promise<void> {
    await this.uow.auto(async () => {
      const userCryptoWallet = await this.userCryptoWalletEntityService.getOne({ userId })
      if (!userCryptoWallet) {
        try {
          await this.onChainService.createIncomingAddress(userId)
        } catch (ignore) {
          // do nothing
        }
      }
    })
  }

  async getIncomingCryptoAddress(userId: number): Promise<string | null> {
    const result = await this.userCryptoWalletEntityService.getOne({ userId })

    return result?.address ?? null
  }

  async verifyCryptoAddressBlacklist(address: string): Promise<void> {
    const blacklistedResult = await this.cryptoAddressBlacklistEntityService.get({ address: address })

    if (blacklistedResult.length > 0) {
      this.logger.warn(`error: crypto address is blacklisted [address: ${address}]`)
      throw new ForbiddenError()
    }
  }

  async blacklistCryptoAddress(address: string, reason: string, createdBy: string): Promise<void> {
    try {
      await this.onChainService.addCryptoAddressToBlacklist(address, reason, createdBy)
    } catch (err: any) {
      if (err instanceof DuplicateValueDbError) {
        throw new BadRequestError('Address is already blacklisted.')
      }

      throw err
    }
  }

  async belongsCryptoAddressToNeobank(address: string): Promise<boolean> {
    const exists = await this.userCryptoWalletEntityService.exists({ address: address })

    return exists
  }

  async verifyCryptoAddress(coin: string, address: string): Promise<void> {
    const isValidAddress = await this.onChainService.verifyAddress(coin, address)

    if (!isValidAddress) {
      throw new BadRequestError('Address is invalid.')
    }
  }

  async verifyNetworkSupport(baseCoin: string): Promise<void> {
    await this.onChainService.verifyIsNetworkSupported(baseCoin)
  }

  async calculateOnChainOrder(payload: CalculateOnChainOrderInput): Promise<CalculateOnChainOrderOutput> {
    // Get calculated totals
    const calculationResult = await this.onChainService.calculateOnChainOrder(
      payload.coin,
      payload.baseCoin,
      payload.toAddress,
      payload.amountUsdc,
    )

    // Store the prebuilt transaction in Redis for 5 min
    const calcTx = JSON.stringify(calculationResult)
    await this.keyValueStorageService.set(`on_chain:${calculationResult.txRef}`, calcTx, 5 * 60)

    return {
      txRef: calculationResult.txRef,
      baseCoin: calculationResult.baseCoin,
      coin: payload.coin,
      amountUsdc: payload.amountUsdc,
      toAddress: payload.toAddress,
      exchangeRate: calculationResult.exchangeRate,
      fees: calculationResult.feeResult,
      totalUsdc: calculationResult.totalUsdc,
    }
  }

  async sendOnChain(userId: number, payload: OnChainOrderInput): Promise<OrderModel> {
    // Get the tx from cache
    const cachedData = await this.keyValueStorageService.getDel(`on_chain:${payload.txRef}`)
    if (!cachedData) {
      this.logger.error(`No cached data found for on-chain transaction reference ${payload.txRef} and user ${userId}`)
      throw new GoneHttpError('Transaction expired.')
    }

    const calculationResult: IOnChainCalculationsResult = JSON.parse(cachedData)

    // Make sure the user can send the money
    await this.moneyTransferService.verifyUserCanSendAmount(userId, calculationResult.totalUsdc)

    // Create the send tx
    const order = await this.onChainService.sendOnChainOrder(userId, calculationResult)

    return order
  }
}
