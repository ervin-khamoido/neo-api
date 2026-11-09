2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import * as assert from 'assert'

import {
  Currency,
  IOnChainOrderEntityService,
  IOnChainOrderFeeEntityService,
  IOrderEntityService,
  IUserEntityService,
  OnChainOrderEntityServiceSymbol,
  OnChainOrderFeeEntityServiceSymbol,
  OnChainOrderType,
  OrderEntityServiceSymbol,
  OrderModel,
  OrderType,
  TransactionModel,
  UserEntityServiceSymbol,
} from '../../../../models/db'
import { IOnChainFeeResult } from '../../../../models/on-chain'

import { IWalletService, WalletServiceSymbol } from '../../../wallet.service'
import { IModernTreasuryService, ModernTreasuryServiceSymbol } from '../../../modern-treasury.service'
import { IOrderConfigurationService, OrderConfigurationServiceSymbol } from '../../../order-configuration.service'
import { IOCOStatusService, OCOStatusServiceSymbol } from './oco-status.service'
import { ITransactionServiceV2, TransactionServiceV2Symbol } from '../../transaction/transaction.service.v2'

export interface IOnChainOrderService {
  createReceiveOnChainOrder(userId: number, payload: ICreateOrder): Promise<OrderModel>
  createReceiveTransaction(orderId: number, payload: ICreateTransaction): Promise<TransactionModel>
  createSendOnChainOrder(userId: number, payload: ICreateOrder, fees: IOnChainFeeResult): Promise<OrderModel>
  createSendTransaction(orderId: number, payload: ICreateTransaction): Promise<TransactionModel>
}

export const OnChainOrderServiceSymbol = Symbol.for('IOnChainOrderService')

@injectable()
export class OnChainOrderService implements IOnChainOrderService {
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(OnChainOrderEntityServiceSymbol) onChainOrderEntityService!: IOnChainOrderEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(OnChainOrderFeeEntityServiceSymbol) onChainOrderFeeEntityService!: IOnChainOrderFeeEntityService

  @inject(WalletServiceSymbol) walletService!: IWalletService
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService
  @inject(OrderConfigurationServiceSymbol) orderConfigurationService!: IOrderConfigurationService
  @inject(OCOStatusServiceSymbol) ocoStatusService!: IOCOStatusService
  @inject(TransactionServiceV2Symbol) transactionService!: ITransactionServiceV2

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(OnChainOrderService)
  }

  async createReceiveOnChainOrder(userId: number, payload: ICreateOrder): Promise<OrderModel> {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      this.logger.error(`unexpected: could not find user id:${userId}`)
      throw new Error(`User not found`)
    }

    // Create the order
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.OnChainOrder)
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.OnChainOrder,
      referenceNumber: referenceNumber,
      userId: userId,
    })

    // Create the transfer order
    await this.onChainOrderEntityService.addOne({
      orderId: order.id,
      type: OnChainOrderType.Receive,

      fromAddress: payload.fromAddress,
      toAddress: payload.toAddress,

      amountRaw: payload.amountRaw,
      amount: payload.amount,
      amountUsdc: payload.amountUsdc,
      totalUsdc: payload.totalUsdc,

      feeRaw: payload.feeRaw,
      fee: payload.fee,

      baseCoin: payload.baseCoin,
      coin: payload.coin,

      providerTransferId: payload.providerTransferId,
    })

    // Create the order status
    await this.ocoStatusService.created(order.id, this.getCreatedBy(user.uid))

    return order
  }

  async createReceiveTransaction(orderId: number, payload: ICreateTransaction): Promise<TransactionModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    assert.ok(order)

    const user = await this.userEntityService.getOne({ id: order.userId })
    assert.ok(user)

    await this.walletService.ensureIncomingWallet(user)

    // Retrieve the incoming and crypto network wallets
    const [incomingWallet, cryptoNetworkWallet] = await Promise.all([
      this.modernTreasuryService.getIncomingAccount(user.uid),
      this.modernTreasuryService.getSystemCryptoNetworkAccount(),
    ])
    if (!incomingWallet) {
      throw new Error(`critical: user incoming wallet is not found. user id: ${user.id}`)
    }

    if (!cryptoNetworkWallet) {
      throw new Error(`critical: crypto network wallet is not found`)
    }

    return this.transactionService.createTransaction(orderId, {
      source: cryptoNetworkWallet.id,
      dest: incomingWallet.id,
      amount: payload.amount,
      currency: Currency.USDC,
      createdBy: this.getCreatedBy(user.uid),
      allowNegativeBalance: true,
    })
  }

  async createSendOnChainOrder(userId: number, payload: ICreateOrder, fees: IOnChainFeeResult): Promise<OrderModel> {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      this.logger.error(`unexpected: could not find user id:${userId}`)
      throw new Error(`User not found`)
    }

    // Create the order
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.OnChainOrder)
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.OnChainOrder,
      referenceNumber: referenceNumber,
      userId: userId,
    })

    // Create the order
    await this.onChainOrderEntityService.addOne({
      orderId: order.id,
      type: OnChainOrderType.Send,

      fromAddress: payload.fromAddress,
      toAddress: payload.toAddress,

      amountRaw: payload.amountRaw,
      amount: payload.amount,
      amountUsdc: payload.amountUsdc,
      totalUsdc: payload.totalUsdc,

      feeRaw: payload.feeRaw,
      fee: payload.fee,

      baseCoin: payload.baseCoin,
      coin: payload.coin,

      providerTransferId: payload.providerTransferId,
    })

    await this.onChainOrderFeeEntityService.addOne({
      orderId: order.id,
      neobankFeeUsdc: fees.neobankFeeUsdc,
      networkFeeUsdc: fees.networkFeeUsdc,
      totalFeeUsdc: fees.totalFeeUsdc,
    })

    // Create the order status
    await this.ocoStatusService.created(order.id, this.getCreatedBy(user.uid))

    return order
  }

  async createSendTransaction(orderId: number, payload: ICreateTransaction): Promise<TransactionModel> {
    const order = await this.orderEntityService.getOne({ id: orderId })
    if (!order) {
      this.logger.error(`unexpected: could not find order:${orderId}`)
      throw new Error(`Order not found`)
    }

    const user = await this.userEntityService.getOne({ id: order.userId })
    if (!user) {
      this.logger.error(`unexpected: could not find user:${order.userId}`)
      throw new Error(`User not found`)
    }

    // Retrieve the user's saving wallet and crypto network wallet
    const [mainWallet, cryptoNetworkWallet] = await Promise.all([
      this.walletService.getMTSavingWallet(user.id),
      this.modernTreasuryService.getSystemCryptoNetworkAccount(),
    ])
    if (!mainWallet) {
      throw new Error(`critical: user main wallet is not found. user id: ${user.id}`)
    }

    if (!cryptoNetworkWallet) {
      throw new Error(`critical: crypto network wallet is not found`)
    }

    return this.transactionService.createTransaction(orderId, {
      source: mainWallet.ledgerAccountId,
      dest: cryptoNetworkWallet.id,
      amount: payload.amount,
      currency: Currency.USDC,
      createdBy: this.getCreatedBy(user.uid),
      allowNegativeBalance: true,
    })
  }

  private getCreatedBy(uid: string) {
    return `on-chain-order-service:${uid}`
  }
}

interface ICreateOrder {
  amount: string
  amountRaw: string
  amountUsdc: number
  totalUsdc: number

  fee: string
  feeRaw: string

  baseCoin: string
  coin: string

  fromAddress: string
  toAddress: string
  providerTransferId: string | null
}

interface ICreateTransaction {
  amount: number
}
