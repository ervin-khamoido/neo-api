2021

import { inject, injectable, named } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { ForbiddenError } from '../errors'

import {
  Currency,
  IOrderEntityService,
  ITransferOrderEntityService,
  IUserEntityService,
  OrderEntityServiceSymbol,
  OrderModel,
  OrderStatusModel,
  OrderType,
  TransactionModel,
  TransactionStatus,
  TransactionStatusModel,
  TransferOrderEntityServiceSymbol,
  TransferOrderModel,
  UserEntityServiceSymbol,
  UserModel,
} from '../models/db'
import { ICreateTransferOrderInput } from '../models/transfer'

import { ExchangeRateServiceSymbol, IExchangeRateService } from './exchange-rate.service'
import { IOrderConfigurationService, OrderConfigurationServiceSymbol } from './order-configuration.service'
import { CalculatorServiceSymbol, ICalculatorService } from './calculator.service'
import { ITransactionService, TransactionServiceSymbol } from './transaction/transaction.service'
import { IWalletService, WalletServiceSymbol } from './wallet.service'
import { IUserBalanceService, UserBalanceServiceSymbol } from './user-balance.service'
import { TOStatusServiceSymbol, ITOStatusService } from './to-status.service'
import { UserStatusServiceSymbol, IUserStatusService } from './user-status.service'
import { IModernTreasuryService, ModernTreasuryServiceSymbol } from './modern-treasury.service'
import { IncomingWalletProcessorEvent } from '../microservice/incoming-wallet-processor/model/queue.config'
import {
  IReceiveMoneyBusinessService,
  ReceiveMoneyBusinessServiceSymbol,
} from './business/receive/receive-money.business.service'

export interface ITransferOrderService {
  createTransferOrder(payload: ICreateTransferOrderInput): Promise<[OrderModel, TransferOrderModel]>
}

export const TransferOrderServiceSymbol = Symbol.for('ITransferOrderService')

@injectable()
export class TransferOrderService implements ITransferOrderService {
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(TransferOrderEntityServiceSymbol) transferOrderEntityService!: ITransferOrderEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  @inject(TOStatusServiceSymbol) toStatusService!: ITOStatusService
  @inject(OrderConfigurationServiceSymbol) orderConfigurationService!: IOrderConfigurationService
  @inject(WalletServiceSymbol) walletService!: IWalletService
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService
  @inject(TransactionServiceSymbol) transactionService!: ITransactionService
  @inject(ExchangeRateServiceSymbol) exchangeRateService!: IExchangeRateService
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService
  @inject(UserStatusServiceSymbol) userStatusService!: IUserStatusService
  @inject(ReceiveMoneyBusinessServiceSymbol) receiveMoneyBusinessService!: IReceiveMoneyBusinessService

  @named('calculatorV2')
  @inject(CalculatorServiceSymbol)
  calculatorService!: ICalculatorService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(TransferOrderService)
  }

  async createTransferOrder(payload: ICreateTransferOrderInput): Promise<[OrderModel, TransferOrderModel]> {
    // Retrieve the sender and receiver users
    const [sender, receiver] = await Promise.all([
      this.userEntityService.getOne({ uid: payload.sender }),
      this.userEntityService.getOne({ uid: payload.receiver }),
    ])

    if (!sender) {
      throw new Error(`critical: user not found [sender: ${payload.sender}]`)
    }

    if (!receiver) {
      throw new Error(`critical: user not found [receiver: ${payload.receiver}]`)
    }

    // Verify the receiver is an active user
    // TO DO: Move this to another service or check for receiver limits maybe
    const isReceiverStatusActive = await this.userStatusService.isUserActive(receiver.id)
    if (!isReceiverStatusActive) {
      this.logger.error(`Receiver [User: ${receiver.uid}] account is not in an active status`)

      throw new ForbiddenError(`User account is not eligible to receive money.`)
    }

    // Retrieve the sender and receiver wallets
    const [senderMTWallet, receiverIncomingAccountId] = await Promise.all([
      this.walletService.getMTSavingWallet(sender.id),
      this.walletService.ensureIncomingWallet(receiver),
    ])

    if (!senderMTWallet) {
      throw new Error(`critical: user's external wallet not found [sender: ${payload.sender}]`)
    }

    if (!receiverIncomingAccountId) {
      throw new Error(`critical: user's external wallet not found [receiver: ${payload.receiver}]`)
    }

    // Create the order
    const referenceNumber = await this.orderConfigurationService.generateOrderReferenceNumber(OrderType.TransferOrder)
    const order = await this.orderEntityService.addOne({
      orderType: OrderType.TransferOrder,
      referenceNumber: referenceNumber,
      userId: sender.id,
    })

    const { sellExchangeRate } = await this.exchangeRateService.getExchangeRate(new Date())
    const amountNgn = await this.calculatorService.convertCurrencyToFiat(payload.amountUsdc, {
      exchangeRate: sellExchangeRate,
    })

    // Create the transfer order
    const transferOrder = await this.transferOrderEntityService.addOne({
      orderId: order.id,
      fromWalletId: senderMTWallet.walletId,
      fromUserId: sender.id,
      from: senderMTWallet.ledgerAccountId,
      toUserId: receiver.id,
      to: receiverIncomingAccountId,
      amountUsdc: payload.amountUsdc,
      amount: amountNgn,
      exchangeRate: sellExchangeRate,
    })

    // Create the order status
    const createdBy = `transfer-service:${payload.sender}`
    const orderStatus = await this.toStatusService.created(order.id, createdBy)

    // Create the transaction
    const [transaction, transactionStatusChangeResult] = await this.transactionService.createTransaction({
      orderId: order.id,
      source: senderMTWallet.ledgerAccountId,
      dest: receiverIncomingAccountId,
      currency: Currency.USDC,
      amount: payload.amountUsdc,
      createdBy: createdBy,
      description: `transfer.internal`,
      lockVersion: payload.lockVersion,
    })

    const { transactionStatus, changed } = transactionStatusChangeResult
    if (transactionStatus.status !== TransactionStatus.Pending) {
      await this.toStatusService.failed(order.id, `transaction:${transaction.uid}`)

      this.logger.error(`critical: unexpected transfer status ${transactionStatus.status} for order:${order.uid}`)

      return [order, transferOrder]
    }

    try {
      const result = await this.transactionService.complete(transactionStatus.transactionId)

      if (result.changed) {
        await this.onTransactionStatusChanged(
          sender,
          receiver,
          order,
          orderStatus,
          transferOrder,
          transaction,
          result.transactionStatus,
        )
      }
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
    }

    return [order, transferOrder]
  }

  private async onTransactionStatusChanged(
    sender: UserModel,
    receiver: UserModel,
    order: OrderModel,
    orderStatus: OrderStatusModel,
    transferOrder: TransferOrderModel,
    transaction: TransactionModel,
    transactionStatus: TransactionStatusModel,
  ): Promise<void> {
    switch (transactionStatus.status) {
      case TransactionStatus.Completed: {
        // Complete the transfer order
        const orderStatus = await this.toStatusService.completed(order.id, `transaction:${transaction.uid}`)

        this.userBalanceService.notifyUserBalance(sender.id)

        // Notify receiver about incoming transaction
        try {
          await this.receiveMoneyBusinessService.notifyReceiveForUser(receiver)
        } catch (err: any) {
          this.logger.error(`critical: Failed to trigger receiver processing ${order.uid}`)
          this.logger.error(err)
        }

        break
      }
      default: {
        throw new Error(`unsupported: transaction status '${transactionStatus.status}' not supported`)
      }
    }
  }
}
