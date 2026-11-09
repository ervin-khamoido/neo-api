2023

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { inject, injectable } from 'inversify'
import { isNil } from 'lodash'

import {
  CardOrderEntityServiceSymbol,
  CardOrderType,
  Currency,
  ICardOrderEntityService,
  IModernTreasuryWalletEntityService,
  IOrderEntityService,
  IUserCardEntityService,
  IUserEntityService,
  ModernTreasuryWalletEntityServiceSymbol,
  OrderEntityServiceSymbol,
  OrderModel,
  OrderType,
  TransactionModel,
  TransactionStatus,
  UserCardEntityServiceSymbol,
  UserEntityServiceSymbol,
} from '../../../../models/db'

import { IOrderConfigurationService, OrderConfigurationServiceSymbol } from '../../../order-configuration.service'
import { CardOrderStatusServiceSymbol, ICardOrderStatusService } from './co-status.service'
import { IWalletService, WalletServiceSymbol } from '../../../wallet.service'
import {
  ImmediateTransactionStatus,
  ITransactionServiceV2,
  TransactionServiceV2Symbol,
} from '../../transaction/transaction.service.v2'
import { IModernTreasuryService, ModernTreasuryServiceSymbol } from '../../../modern-treasury.service'
import { USDC_CURRENCY } from '../../../../utils/calculator-utils'

export interface ICardOrderService {
  createInternalOrder(userId: number, body: ICreateInternalOrderInput): Promise<OrderModel>
  createInternalTransaction(orderId: number, payload: ICreateInternalTransaction): Promise<TransactionModel>

  createSpendOrder(userId: number, body: ICreateCreditOrderInput): Promise<OrderModel>
  completeSpendTransaction(orderId: number, payload: ICreateTransaction): Promise<TransactionModel>
  declineSpendTransaction(orderId: number, payload: ICreateTransaction): Promise<TransactionModel>

  createReversalOrder(userId: number, body: ICreateCreditOrderInput): Promise<OrderModel>
  completeReversalTransaction(orderId: number, payload: ICreateTransaction): Promise<TransactionModel>

  createFeeOrder(userId: number, body: ICreateCardFeeOrderInput): Promise<OrderModel>
  createFeeTransaction(orderId: number, payload: ICreateFeeTransaction): Promise<TransactionModel>
}

export const CardOrderServiceSymbol = Symbol.for('ICardOrderService')

@injectable()
export class CardOrderService implements ICardOrderService {
  @inject(CardOrderEntityServiceSymbol) cardOrderEntityService!: ICardOrderEntityService
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserCardEntityServiceSymbol) userCardEntityService!: IUserCardEntityService

  @inject(CardOrderStatusServiceSymbol) cardOrderStatusService!: ICardOrderStatusService
  @inject(OrderConfigurationServiceSymbol) orderConfigurationService!: IOrderConfigurationService
  @inject(TransactionServiceV2Symbol) transactionService!: ITransactionServiceV2
  @inject(WalletServiceSymbol) walletService!: IWalletService
  @inject(ModernTreasuryWalletEntityServiceSymbol) mtWalletEntityService!: IModernTreasuryWalletEntityService
  @inject(ModernTreasuryServiceSymbol) mtService!: IModernTreasuryService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(CardOrderService)
  }

  async createInternalOrder(userId: number, payload: ICreateInternalOrderInput): Promise<OrderModel> {
    // get user
    const [user, userCard] = await Promise.all([
      this.userEntityService.getOne({ id: userId }),
      this.userCardEntityService.getOne({ id: payload.cardId }),
    ])
    if (!user) {
      this.logger.error(`unexpected: could not find user`)
      throw new Error(`User not found`)
    }

    if (!userCard) {
      this.logger.error(`critical: cannot find virtual card for user`)
      throw new Error('System error')
    }

    // The `type` check here is to allow initial fund orders to still flow through since the provider ID will not be set yet
    if (isNil(userCard.providerCardId) && payload.type !== CardOrderType.InitialFund) {
      this.logger.error(
        `critical: virtual card for user does not have provider card ID and is not an initial fund order`,
      )
      throw new Error('System error')
    }

    // Create the order
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.CardOrder)
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.CardOrder,
      referenceNumber: referenceNumber,
      userId: userId,
    })

    // Create the card order
    const orderTotal = USDC_CURRENCY(payload.amount).add(payload.fee).value
    await this.cardOrderEntityService.addOne({
      orderId: order.id,
      cardId: userCard.id,
      amountUsdc: payload.amount,
      feeUsdc: payload.fee,
      totalUsdc: orderTotal,
      type: payload.type,
      providerTransactionReference: null,
      providerPayload: null,
      providerDescription: null,
    })

    // Create the order status
    const createdBy = `u:${user.uid}`
    await this.cardOrderStatusService.created(order.id, createdBy)

    return order
  }

  async createInternalTransaction(orderId: number, payload: ICreateInternalTransaction): Promise<TransactionModel> {
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

    let [sourceWallet, destWallet] = await Promise.all([
      this.walletService.getMTSavingWallet(user.id),
      this.mtWalletEntityService.getOne({ walletId: payload.cardWalletId }),
    ])
    if (!sourceWallet) {
      this.logger.error(`unexpected: could not find user mt saving wallet for user uid:${user.uid}`)
      throw new Error(`Saving Wallet not found`)
    }
    if (!destWallet) {
      this.logger.error(`unexpected: could not find user mt card wallet for user uid:${user.uid}`)
      throw new Error(`Card Wallet not found`)
    }

    if (payload.orderType === CardOrderType.Unload) {
      // swap wallets for unload operation
      ;[destWallet, sourceWallet] = [sourceWallet, destWallet]
    }

    // Create the transaction
    const createdBy = `u:${user.uid}`
    return this.transactionService.createTransaction(orderId, {
      source: sourceWallet.ledgerAccountId,
      dest: destWallet.ledgerAccountId,
      currency: Currency.USDC,
      amount: payload.amount,
      createdBy: createdBy,
      description: `card.${payload.orderType}`,
      allowNegativeBalance: true,
    })
  }

  async createSpendOrder(userId: number, payload: ICreateCreditOrderInput): Promise<OrderModel> {
    // get user
    const [user, userCard] = await Promise.all([
      this.userEntityService.getOne({ id: userId }),
      this.userCardEntityService.getOne({ id: payload.cardId }),
    ])
    if (!user) {
      this.logger.error(`unexpected: could not find user`)
      throw new Error(`User not found`)
    }
    if (!userCard) {
      this.logger.error(`critical: cannot find virtual card for user`)
      throw new Error('System error')
    }

    // Create the order
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.CardOrder)
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.CardOrder,
      referenceNumber: referenceNumber,
      userId: userId,
    })

    // Create the card order
    const orderTotal = USDC_CURRENCY(payload.amount).add(payload.fee).value
    await this.cardOrderEntityService.addOne({
      orderId: order.id,
      cardId: userCard.id,
      amountUsdc: payload.amount,
      feeUsdc: payload.fee,
      totalUsdc: orderTotal,
      type: CardOrderType.Spend,
      providerTransactionReference: payload.providerTransactionReference,
      providerPayload: payload.providerPayload,
      providerDescription: payload.providerDescription ?? null,
    })

    // Create the order status
    const createdBy = `u:${user.uid}`
    await this.cardOrderStatusService.created(order.id, createdBy)

    return order
  }

  async completeSpendTransaction(orderId: number, payload: ICreateTransaction): Promise<TransactionModel> {
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

    const [cardMTWallet, cardNetworkAccount] = await Promise.all([
      this.mtWalletEntityService.getOne({ walletId: payload.cardWalletId }),
      this.mtService.getSystemCardNetworkAccount(),
    ])
    if (!cardMTWallet) {
      this.logger.error(`unexpected: could not find user mt card wallet for user uid:${user.uid}`)
      throw new Error(`Card Wallet not found`)
    }
    if (!cardNetworkAccount) {
      this.logger.error(`unexpected: could not find user mt Card Network Account`)
      throw new Error(`Card Network Account not found`)
    }

    // Create the transaction
    const createdBy = `u:${user.uid}`
    return this.transactionService.createTransaction(
      orderId,
      {
        source: cardMTWallet.ledgerAccountId,
        dest: cardNetworkAccount.id,
        currency: Currency.USDC,
        amount: payload.amount,
        createdBy: createdBy,
        description: `card.${CardOrderType.Spend}`,
        allowNegativeBalance: true,
      },
      TransactionStatus.Completed,
    )
  }

  async declineSpendTransaction(orderId: number, payload: ICreateTransaction): Promise<TransactionModel> {
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

    const [cardMTWallet, cardNetworkAccount] = await Promise.all([
      this.mtWalletEntityService.getOne({ walletId: payload.cardWalletId }),
      this.mtService.getSystemCardNetworkAccount(),
    ])
    if (!cardMTWallet) {
      this.logger.error(`unexpected: could not find user mt card wallet for user uid:${user.uid}`)
      throw new Error(`Card Wallet not found`)
    }
    if (!cardNetworkAccount) {
      this.logger.error(`unexpected: could not find user mt Card Network Account`)
      throw new Error(`Card Network Account not found`)
    }

    // Create the transaction
    const createdBy = `u:${user.uid}`
    return this.transactionService.createTransaction(
      orderId,
      {
        source: cardMTWallet.ledgerAccountId,
        dest: cardNetworkAccount.id,
        currency: Currency.USDC,
        amount: payload.amount,
        createdBy: createdBy,
        description: `card.${CardOrderType.Spend}`,
        allowNegativeBalance: true,
      },
      TransactionStatus.Failed,
    )
  }

  async createReversalOrder(userId: number, payload: ICreateCreditOrderInput): Promise<OrderModel> {
    // get user
    const [user, userCard] = await Promise.all([
      this.userEntityService.getOne({ id: userId }),
      this.userCardEntityService.getOne({ id: payload.cardId }),
    ])
    if (!user) {
      this.logger.error(`unexpected: could not find user`)
      throw new Error(`User not found`)
    }
    if (!userCard) {
      this.logger.error(`critical: cannot find virtual card for user`)
      throw new Error('System error')
    }

    // Create the order
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.CardOrder)
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.CardOrder,
      referenceNumber: referenceNumber,
      userId: userId,
    })

    // Create the card order
    const orderTotal = USDC_CURRENCY(payload.amount).add(payload.fee).value
    await this.cardOrderEntityService.addOne({
      orderId: order.id,
      cardId: userCard.id,
      amountUsdc: payload.amount,
      feeUsdc: payload.fee,
      totalUsdc: orderTotal,
      type: CardOrderType.Reversal,
      providerTransactionReference: payload.providerTransactionReference,
      providerPayload: payload.providerPayload,
      providerDescription: payload.providerDescription ?? null,
    })

    // Create the order status
    const createdBy = `u:${user.uid}`
    await this.cardOrderStatusService.created(order.id, createdBy)

    return order
  }

  async completeReversalTransaction(orderId: number, payload: ICreateTransaction): Promise<TransactionModel> {
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

    const [cardNetworkAccount, cardMTWallet] = await Promise.all([
      this.mtService.getSystemCardNetworkAccount(),
      this.mtWalletEntityService.getOne({ walletId: payload.cardWalletId }),
    ])
    if (!cardNetworkAccount) {
      this.logger.error(`unexpected: could not find user mt Card Network Account`)
      throw new Error(`Card Network Account not found`)
    }
    if (!cardMTWallet) {
      this.logger.error(`unexpected: could not find user mt card wallet for user uid:${user.uid}`)
      throw new Error(`Card Wallet not found`)
    }

    // Create the transaction
    const createdBy = `u:${user.uid}`
    return this.transactionService.createTransaction(
      orderId,
      {
        source: cardNetworkAccount.id,
        dest: cardMTWallet.ledgerAccountId,
        currency: Currency.USDC,
        amount: payload.amount,
        createdBy: createdBy,
        description: `card.${CardOrderType.Reversal}`,
        allowNegativeBalance: true,
      },
      TransactionStatus.Completed,
    )
  }

  async createFeeOrder(userId: number, body: ICreateCardFeeOrderInput): Promise<OrderModel> {
    // get user
    const [user, userCard] = await Promise.all([
      this.userEntityService.getOne({ id: userId }),
      this.userCardEntityService.getOne({ id: body.cardId }),
    ])
    if (!user) {
      this.logger.error(`unexpected: could not find user`)
      throw new Error(`User not found`)
    }
    if (!userCard) {
      this.logger.error(`critical: cannot find virtual card for user`)
      throw new Error('System error')
    }

    // Create the order
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.CardOrder)
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.CardOrder,
      referenceNumber: referenceNumber,
      userId: userId,
    })

    // Create the card order
    await this.cardOrderEntityService.addOne({
      orderId: order.id,
      cardId: userCard.id,
      amountUsdc: body.amount,
      feeUsdc: 0,
      totalUsdc: body.amount,
      type: body.orderType,
      providerTransactionReference: body.providerTransactionReference ?? null,
      providerPayload: null,
      providerDescription: null,
    })

    // Create the order status
    const createdBy = `u:${user.uid}`
    await this.cardOrderStatusService.created(order.id, createdBy)

    return order
  }

  async createFeeTransaction(orderId: number, payload: ICreateFeeTransaction): Promise<TransactionModel> {
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

    const [savingMTWallet, cardMTWallet, cardNetworkAccount] = await Promise.all([
      this.walletService.getMTSavingWallet(user.id),
      this.mtWalletEntityService.getOne({ walletId: payload.cardWalletId }),
      this.mtService.getSystemCardNetworkAccount(),
    ])
    if (!savingMTWallet) {
      this.logger.error(`unexpected: could not find user mt saving wallet for user uid:${user.uid}`)
      throw new Error(`Saving Wallet not found`)
    }
    if (!cardMTWallet) {
      this.logger.error(`unexpected: could not find user mt card wallet for user uid:${user.uid}`)
      throw new Error(`Card Wallet not found`)
    }
    if (!cardNetworkAccount) {
      this.logger.error(`unexpected: could not find user mt Card Network Account`)
      throw new Error(`Card Network Account not found`)
    }

    // Create the transaction
    const createdBy = `u:${user.uid}`
    // ** Depends on who will charge the fee
    // if Neobank charges, then we debit the Saving Wallet
    // if Bridgecard charges, then we debit the Card Wallet
    const sourceAccount = payload.debitFeeFromCardWallet ? cardMTWallet.ledgerAccountId : savingMTWallet.ledgerAccountId

    return this.transactionService.createTransaction(
      orderId,
      {
        source: sourceAccount,
        dest: cardNetworkAccount.id,
        currency: Currency.USDC,
        amount: payload.amount,
        createdBy: createdBy,
        description: `card.${CardOrderType.Fee}`,
        parentTransactionId: payload.parentTransactionId,
        allowNegativeBalance: true,
      },
      payload.immediateStatus,
    )
  }
}

export interface ICreateInternalOrderInput {
  amount: number
  type: CardOrderType.Fund | CardOrderType.Unload | CardOrderType.InitialFund
  fee: number
  cardId: number
}

export interface ICreateCreditOrderInput {
  amount: number
  fee: number

  providerTransactionReference: string | null
  providerPayload: object | null
  providerDescription?: string

  cardId: number
}

export interface ICreateCardFeeOrderInput {
  amount: number
  orderType: CardOrderType.Fee | CardOrderType.SpendFee

  cardId: number

  providerTransactionReference?: string | null
}

export interface ICreateInternalTransaction {
  amount: number
  cardWalletId: string
  orderType: CardOrderType.Fund | CardOrderType.Unload | CardOrderType.InitialFund
}

export interface ICreateTransaction {
  amount: number
  cardWalletId: string
}

export interface ICreateFeeTransaction {
  amount: number

  cardWalletId: string

  parentTransactionId?: number
  immediateStatus?: ImmediateTransactionStatus
  debitFeeFromCardWallet?: boolean
}
