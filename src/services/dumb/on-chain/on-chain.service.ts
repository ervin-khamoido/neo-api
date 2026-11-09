2023

import { inject, injectable } from 'inversify'
import { firestore } from 'firebase-admin'
import BigNumber from 'bignumber.js'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { DuplicateValueDbError } from '@ts-awesome/orm-pg'
import { NotFoundError, RequestError, StatusCode } from '@ts-awesome/rest'

import { USDC_CURRENCY } from '../../../utils/calculator-utils'

import {
  CryptoAddressBlacklistEntityServiceSymbol,
  ICryptoAddressBlacklistEntityService,
  IOnChainOrderEntityService,
  IUserCryptoWalletEntityService,
  IUserEntityService,
  OnChainOrderEntityServiceSymbol,
  OrderModel,
  TransactionModel,
  TransactionStatus,
  UserCryptoWalletEntityServiceSymbol,
  UserCryptoWalletModel,
  UserCryptoWalletStatus,
  UserEntityServiceSymbol,
} from '../../../models/db'
import { IAddressConfirmationPayload, ITransferPayload } from '../../webhooks/models/bitgo.input'
import { CreateAddressOutput } from './models/create-address.output'
import { BitgoError } from './models/bitgo.error'
import { TransferOutput, TransferState, TransferType } from './models/transfer.output'
import { IOnChainCalculationsResult, IOnChainFeeConfig, IOnChainFeeResult } from '../../../models/on-chain'
import { BitGoConfigSymbol, IBitGoConfig } from '../../../models/config'

import { IOnChainOrderService, OnChainOrderServiceSymbol } from './order/on-chain-order.service'
import { ITransactionServiceV2, TransactionServiceV2Symbol } from '../transaction/transaction.service.v2'
import { IOCOStatusService, OCOStatusServiceSymbol } from './order/oco-status.service'
import { IOCOActivityService, OCOActivityServiceSymbol } from './activity/oco-activity.service'
import { FeeServiceSymbol, IFeeService } from '../../fee.service'
import { IOnChainExchangeRateService, OnChainExchangeRateServiceSymbol } from './on-chain-exchange-rate.service'
import { BitGoServiceSymbol, IBitGoService } from './bitgo.service'

export interface IOnChainService {
  createIncomingAddress(userId: number): Promise<void>
  confirmAddress(address: string, payload: IAddressConfirmationPayload): Promise<number>
  notifyIncomingAddressUpdate(userId: number): Promise<void>
  addCryptoAddressToBlacklist(address: string, reason: string, createdBy: string): Promise<void>

  onTransfer(transferId: string, payload: ITransferPayload): Promise<number>
  sendOnChainOrder(userId: number, payload: IOnChainCalculationsResult): Promise<OrderModel>
  calculateOnChainOrder(
    coin: string,
    baseCoin: string,
    toAddress: string,
    amountUsdc: number,
  ): Promise<IOnChainCalculationsResult>

  // verify
  verifyIsCoinSupported(coin: string): Promise<void>
  verifyIsNetworkSupported(baseCoin: string): Promise<void>
  verifyWallet(coin: string): Promise<void>
  verifyAddress(coin: string, address: string): Promise<boolean>
}

export const OnChainServiceSymbol = Symbol.for('IOnChainService')

@injectable()
export class OnChainService implements IOnChainService {
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(CryptoAddressBlacklistEntityServiceSymbol)
  cryptoAddressBlacklistEntityService!: ICryptoAddressBlacklistEntityService
  @inject(UserCryptoWalletEntityServiceSymbol) userCryptoWalletService!: IUserCryptoWalletEntityService
  @inject(OnChainOrderEntityServiceSymbol) onChainOrderEntityService!: IOnChainOrderEntityService

  @inject(BitGoServiceSymbol) bitGoService!: IBitGoService
  @inject(OnChainOrderServiceSymbol) onChainOrderService!: IOnChainOrderService
  @inject(OnChainExchangeRateServiceSymbol) onChainExchangeRateService!: IOnChainExchangeRateService

  @inject(TransactionServiceV2Symbol) transactionService!: ITransactionServiceV2
  @inject(OCOStatusServiceSymbol) ocoStatusService!: IOCOStatusService
  @inject(OCOActivityServiceSymbol) ocoActivityService!: IOCOActivityService
  @inject(FeeServiceSymbol) feeService!: IFeeService

  @inject(BitGoConfigSymbol) bitGoConfig!: IBitGoConfig

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(OnChainService)
  }

  async createIncomingAddress(userId: number): Promise<void> {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      this.logger.error('unexpected: the user is not found')
      throw new Error('unexpected: the user is not found')
    }

    // Create a record in user_crypto_wallet table
    // it can fail because userId has a unique constraint, and it's expected behaviour
    let userCryptoWallet: UserCryptoWalletModel | null = null
    try {
      userCryptoWallet = await this.userCryptoWalletService.addOne({
        userId: userId,
        provider: 'bitgo',
        status: UserCryptoWalletStatus.Pending,
      })
    } catch (err) {
      if (err instanceof DuplicateValueDbError) {
        // all good it's expected behaviour
        throw new Error('The address for the user has already been created')
      } else {
        this.logger.error('critical: unexpected error when creating a user_crypto_wallet record')
        this.logger.error(err as Error)
        throw new Error('unexpected: failed to create a user_crypto_wallet record')
      }
    }

    let response: CreateAddressOutput | null = null
    try {
      const { baseCoin, inOutWalletId } = this.bitGoConfig

      response = await this.bitGoService.createAddress(baseCoin, inOutWalletId, {
        label: `u:${user.uid}`,
      })
    } catch (err) {
      let providerPayload: object | null = null
      if (err instanceof BitgoError) {
        providerPayload = err.payload
      }

      await this.userCryptoWalletService.updateOne({
        id: userCryptoWallet.id,
        providerPayload: providerPayload,
        status: UserCryptoWalletStatus.Failure,
      })

      this.logger.error('critical: unexpected error when creating a crypto address in BitGo')
      this.logger.error(err as Error)
      throw err
    }

    await this.userCryptoWalletService.updateOne({
      id: userCryptoWallet.id,
      providerAddressId: response.id,
      status: UserCryptoWalletStatus.Pending,
    })
  }

  async confirmAddress(address: string, payload: IAddressConfirmationPayload): Promise<number> {
    // TODO: we must know what is the wallet's base coin
    const { baseCoin } = this.bitGoConfig
    const response = await this.bitGoService.getAddress(baseCoin, payload.walletId, address)

    const userCryptoWallet = await this.userCryptoWalletService.getForUpdateByProviderAddressId(response.id)
    if (!userCryptoWallet) {
      throw new Error(
        `unexpected: the user_crypto_wallet record is not found for Address: ${address} | Address ID: ${response.id}`,
      )
    }

    await this.userCryptoWalletService.updateOne({
      id: userCryptoWallet.id,
      status: UserCryptoWalletStatus.Created,
      address: response.address,
      providerPayload: payload,
    })

    return userCryptoWallet.id
  }

  async notifyIncomingAddressUpdate(userId: number): Promise<void> {
    try {
      const user = await this.userEntityService.getOne({ id: userId })
      if (!user) {
        this.logger.error(`notifyAddressUpdate(): user with a userId ${userId} is not found`)
        return
      }

      const increment = firestore.FieldValue.increment(1)
      await firestore()
        .collection('user')
        .doc(user.fireUserId)
        .set({ incomingAddress: { version: increment } }, { merge: true })
    } catch (err: any) {
      this.logger.error(`critical: notify user about incoming address update failed`)
      this.logger.error(err)
    }
  }

  async onTransfer(transferId: string, payload: ITransferPayload): Promise<number> {
    const transfer = await this.bitGoService.getTransfer(transferId, payload.coin, payload.wallet)
    switch (transfer.type) {
      case TransferType.Receive: {
        if (transfer.wallet === this.bitGoConfig.quarantineWalletId) {
          // handle the quarantine receive transfer
          throw new Error(`unexpected: quarantine wallet is not implemented yet`)
        } else if (transfer.wallet === this.bitGoConfig.inOutWalletId) {
          // handle the in-out receive transfer
          return this.onInOutReceiveTransfer(transfer)
        } else {
          // ???
          this.logger.error(`unexpected: wallet receive transfers are not implemented transfer->id:${transfer.id}`)
          throw new Error(`unexpected: wallet's receive transfers are not implemented`)
        }
      }
      case TransferType.Send: {
        if (transfer.wallet === this.bitGoConfig.inOutWalletId) {
          // handle the in-out send transfer
          return await this.onInOutSendTransfer(transfer)
        } else {
          this.logger.error(`unexpected: wallet send transfers are not implemented transfer->id:${transfer.id}`)
          throw new Error(`unexpected: wallet's send transfers are not implemented`)
        }
      }
      default:
        throw new Error(`unexpected: unknown transfer type ${transfer.type} for transfer ${transferId}`)
    }
  }

  async addCryptoAddressToBlacklist(address: string, reason: string, createdBy: string): Promise<void> {
    await this.cryptoAddressBlacklistEntityService.addOne({
      address: address,
      blacklistReason: reason,
      createdBy: createdBy,
    })
  }

  private async onInOutReceiveTransfer(transfer: TransferOutput): Promise<number> {
    const receiverItem = transfer.entries.find(x => x.value > 0)
    if (!receiverItem) {
      throw new Error(`critical: unable to find receiver entry in the transfer id:${transfer.id}`)
    }

    const senderItem = transfer.entries.find(x => x.value < 0)
    if (!senderItem) {
      throw new Error(`critical: unable to find sender entry in the transfer id:${transfer.id}`)
    }

    const userCryptoWallet = await this.userCryptoWalletService.getOne({ address: receiverItem.address })
    if (!userCryptoWallet) {
      throw new Error(`critical: unable to find user's crypto wallet in DB address:${receiverItem.address}`)
    }

    const tokenConfig = OnChainTokenConfig[transfer.coin as OnChainToken]

    const amount = new BigNumber(transfer.valueString).div(tokenConfig.exponent)
    const fee = new BigNumber(transfer.feeString).div(tokenConfig.exponent)
    const order = await this.onChainOrderService.createReceiveOnChainOrder(userCryptoWallet.userId, {
      amountRaw: transfer.valueString,
      amount: amount.toString(),
      amountUsdc: USDC_CURRENCY(amount.toString()).value, // TODO: for now hardcoded
      totalUsdc: USDC_CURRENCY(amount.toString()).value, // TODO: for now hardcoded, should be same as amount usdc for receive

      feeRaw: transfer.feeString,
      fee: fee.toString(),

      fromAddress: senderItem.address,
      toAddress: receiverItem.address,

      coin: transfer.coin,
      baseCoin: this.bitGoConfig.baseCoin, // for now hardcoded

      providerTransferId: transfer.id,
    })
    await this.ocoActivityService.createActivity(order.id)

    // processing the main transaction
    let transaction: TransactionModel | null = null
    try {
      transaction = await this.onChainOrderService.createReceiveTransaction(order.id, {
        amount: amount.toNumber(),
      })
    } catch (err: any) {
      this.logger.error(err)

      await this.ocoStatusService.failure(order.id, 'on-chain-service:onInOutReceiveTransfer')
      await this.ocoActivityService.failActivity(order.id)

      // TODO: this will rollback the transaction. We don't need this because we handled the error
      // throw new Error(`Failed to create a transaction`)

      return order.id
    }

    if (transfer.state === TransferState.Confirmed) {
      await this.transactionService.completeTransaction(transaction.id)
    } else {
      await this.transactionService.failTransaction(transaction.id)
    }
    // finished processing the main transaction

    // currently the order is completed if transaction is completed
    const transactionStatus = await this.transactionService.getTransactionStatus(transaction.id)
    if (transactionStatus === TransactionStatus.Completed) {
      await this.ocoStatusService.completed(order.id, 'on-chain-service:onInOutReceiveTransfer')
      await this.ocoActivityService.completeActivity(order.id)
    } else {
      await this.ocoStatusService.failure(order.id, 'on-chain-service:onInOutReceiveTransfer')
      await this.ocoActivityService.failActivity(order.id)
    }

    return order.id
  }

  private async onInOutSendTransfer(transfer: TransferOutput): Promise<number> {
    const receiverItem = transfer.entries.find(x => x.value > 0)
    if (!receiverItem) {
      throw new Error(`critical: unable to find receiver entry in the transfer id:${transfer.id}`)
    }

    const senderItem = transfer.entries.find(x => x.value < 0)
    if (!senderItem) {
      throw new Error(`critical: unable to find sender entry in the transfer id:${transfer.id}`)
    }

    // Get the order and transaction
    const onChainOrder = await this.onChainOrderEntityService.getOne({ providerTransferId: transfer.id })
    if (!onChainOrder) {
      throw new Error(`unexpected: on chain order for transfer id ${transfer.id} not found`)
    }

    const transactions = await this.transactionService.getTransactionsByOrderId(onChainOrder.orderId)
    if (transactions.length < 1) {
      throw new Error(`unexpected: no transactions found for on chain order ${onChainOrder.orderId}`)
    }

    const transaction = transactions[0]

    if (transfer.state === TransferState.Confirmed) {
      await this.transactionService.completeTransaction(transaction.id)
    } else {
      await this.transactionService.failTransaction(transaction.id)
    }

    // currently the order is completed if transaction is completed
    const transactionStatus = await this.transactionService.getTransactionStatus(transaction.id)
    if (transactionStatus === TransactionStatus.Completed) {
      await this.ocoStatusService.completed(onChainOrder.orderId, 'on-chain-service:onInOutSendTransfer')
      await this.ocoActivityService.completeActivity(onChainOrder.orderId)
    } else {
      await this.ocoStatusService.failure(onChainOrder.orderId, 'on-chain-service:onInOutSendTransfer')
      await this.ocoActivityService.failActivity(onChainOrder.orderId)
    }

    return onChainOrder.orderId
  }

  async calculateOnChainOrder(
    coin: string,
    baseCoin: string,
    toAddress: string,
    amountUsdc: number,
  ): Promise<IOnChainCalculationsResult> {
    if (baseCoin !== this.bitGoConfig.baseCoin) {
      throw new RequestError(
        'Sorry, this feature is not fully implemented yet.',
        'NotImplemented',
        StatusCode.NotImplemented,
      )
    }

    const baseCoinConfig = OnChainTokenConfig[baseCoin as OnChainToken]
    const coinConfig = OnChainTokenConfig[coin as OnChainToken]

    const fees = await this.feeService.getFees()
    if (!fees) {
      this.logger.error(`Fees not found`)
      throw new Error('Fees not found')
    }

    const exchangeRateInfo = await this.onChainExchangeRateService.getLatestExchangeRate(baseCoin)
    if (!exchangeRateInfo) {
      this.logger.error(`On-chain exchange rate info not found for token ${baseCoin}`)
      throw new Error('Exchange rate information not found')
    }

    // Prebuild the transaction
    const amount = new BigNumber(amountUsdc)
    const amountRaw = new BigNumber(amountUsdc).times(coinConfig.exponent)
    const prebuiltTransaction = await this.bitGoService.prebuildTransaction(coin, toAddress, amountRaw.toString())

    // Calculate network fees using exchange rate info
    const exchangeRate = new BigNumber(exchangeRateInfo.exchangeRate)
    const networkFeeRaw = new BigNumber(prebuiltTransaction.gasPrice)
    const networkFee = new BigNumber(prebuiltTransaction.gasPrice).div(baseCoinConfig.exponent)
    const networkFeeUsdc = networkFee.multipliedBy(exchangeRate)

    // Calculate the fees
    const networkFeeUsdcValue = USDC_CURRENCY(networkFeeUsdc.toNumber()).value

    const feeResult = await this.calculateOnChainOrderFee(amountUsdc, networkFeeUsdcValue, {
      percentageFee: fees.sendOnChainPercentageFee,
      flatFee: fees.sendOnChainFlatFee,
      maxFee: fees.sendOnChainMaxFee,
      minFee: fees.sendOnChainMinFee,
    })

    // Calculate the total (amount + fees)
    const totalUsdc = USDC_CURRENCY(amountUsdc).add(feeResult.totalFeeUsdc)
    return {
      amountUsdc: amountUsdc,
      totalUsdc: totalUsdc.value,
      exchangeRate: USDC_CURRENCY(exchangeRateInfo.exchangeRate).value,
      feeResult: feeResult,
      baseCoin: baseCoin,
      toAddress: toAddress,

      txRef: prebuiltTransaction.txInfo.id,
      txPrebuilt: prebuiltTransaction,
      coin: coin,
      amount: amount.toString(10),
      amountRaw: amountRaw.toString(10),
      fee: networkFee.toString(10),
      feeRaw: networkFeeRaw.toString(10),
    }
  }

  async calculateOnChainOrderFee(
    amountUsdc: number,
    networkFeeUsdc: number,
    config: IOnChainFeeConfig,
  ): Promise<IOnChainFeeResult> {
    const amount = USDC_CURRENCY(amountUsdc)

    // flat fee
    const flatFee = USDC_CURRENCY(config.flatFee ?? 0)

    // Neobank Fee = purchase Amount * percentage fee multiplier
    const multiplierFee = amount.multiply(config.percentageFee ?? 0)

    // Calculated neobank fee = flat fee + multiplier fee
    let neobankFee = flatFee.add(multiplierFee)

    // Neobank fee = minimum fee if neobank fee is < minimum fee OR maximum if neobank fee is > max
    if (config.maxFee && neobankFee.value > config.maxFee) {
      neobankFee = USDC_CURRENCY(config.maxFee)
    } else if (config.minFee && neobankFee.value < config.minFee) {
      neobankFee = USDC_CURRENCY(config.minFee)
    }

    // total fee = (neobank fee + network fee)
    const totalFee = neobankFee.add(networkFeeUsdc)

    return {
      totalFeeUsdc: totalFee.value,
      networkFeeUsdc: networkFeeUsdc,
      neobankFeeUsdc: neobankFee.value,
    }
  }

  async sendOnChainOrder(userId: number, payload: IOnChainCalculationsResult): Promise<OrderModel> {
    const userCryptoWallet = await this.userCryptoWalletService.getOne({ userId })
    if (!userCryptoWallet?.address) {
      throw new NotFoundError('Crypto wallet is not found')
    }

    // Create the order
    const order = await this.onChainOrderService.createSendOnChainOrder(
      userId,
      {
        coin: payload.coin,
        amount: payload.amount,
        amountRaw: payload.amountRaw,
        fee: payload.fee,
        feeRaw: payload.feeRaw,

        amountUsdc: payload.amountUsdc,
        totalUsdc: payload.totalUsdc,
        baseCoin: payload.baseCoin,
        fromAddress: userCryptoWallet.address,
        toAddress: payload.toAddress,
        providerTransferId: null,
      },
      payload.feeResult,
    )

    // The webhook may arrive faster than the transaction in DB is finished
    // it is unlikely to happen because the confirmation on-chain usually takes time
    // however, we must ensure it won't happen at all even in theory
    await this.onChainOrderEntityService.getForUpdateById(order.id)

    // Create the activity
    await this.ocoActivityService.createActivity(order.id)

    // Create the MT transaction
    let transaction: TransactionModel | null = null
    try {
      transaction = await this.onChainOrderService.createSendTransaction(order.id, {
        amount: payload.totalUsdc,
      })
    } catch (err: any) {
      this.logger.error(err)

      await this.ocoStatusService.failure(order.id, 'on-chain-service:sendOnChainOrder')
      await this.ocoActivityService.failActivity(order.id)

      return order
    }

    // Create the transfer
    let transfer: TransferOutput | null = null
    try {
      transfer = await this.bitGoService.submitTransaction(payload.coin, payload.txPrebuilt)
    } catch (err: any) {
      this.logger.error(`Failed to send money on chain for user ${userId}`)
      this.logger.error(err)

      await this.ocoStatusService.failure(order.id, 'on-chain-service:sendOnChainOrder')
      await this.ocoActivityService.failActivity(order.id)

      return order
    }

    // If we didn't get the transfer back for whatever reason, fail the order ?
    if (!transfer || transfer.state === TransferState.Failed) {
      this.logger.error(`Did not receive transfer from on chain send for user ${userId}`)

      await this.ocoStatusService.failure(order.id, 'on-chain-service:sendOnChainOrder')
      await this.ocoActivityService.failActivity(order.id)

      return order
    }

    const senderItem = transfer.entries.find(x => x.value < 0)
    if (!senderItem) {
      throw new Error(`critical: unable to find sender entry in the transfer id:${transfer.id}`)
    }

    // Update with transfer details after transfer is created
    await this.onChainOrderEntityService.updateOne({
      orderId: order.id,
      fromAddress: senderItem.address,
      providerTransferId: transfer.id,
    })

    // The transfer will likely be in a 'signed' state, but complete the order if for some reason it is completed
    if (transfer.state === TransferState.Confirmed) {
      await this.transactionService.completeTransaction(transaction.id)
    }

    // Currently the order is completed if transaction is completed
    const transactionStatus = await this.transactionService.getTransactionStatus(transaction.id)
    if (transactionStatus === TransactionStatus.Completed) {
      await this.ocoStatusService.completed(order.id, 'on-chain-service:sendOnChainOrder')
      await this.ocoActivityService.completeActivity(order.id)
    }

    return order
  }

  // verify functions
  async verifyIsCoinSupported(coin: string): Promise<void> {
    if (!SupportedOnChainToken.includes(coin as OnChainToken)) {
      throw new NotFoundError(`Coin ${coin} is not supported.`)
    }
  }

  async verifyIsNetworkSupported(baseCoin: string): Promise<void> {
    if (!SupportedOnChainNetwork.includes(baseCoin as OnChainBaseCoin)) {
      throw new NotFoundError(`Network ${baseCoin} is not supported.`)
    }
  }

  async verifyWallet(wallet: string): Promise<void> {
    const { inOutWalletId, quarantineWalletId, floatWalletId } = this.bitGoConfig

    const knownWallets = [inOutWalletId, quarantineWalletId, floatWalletId]
    if (!knownWallets.includes(wallet)) {
      throw new NotFoundError(`Unknown wallet id:${wallet}`)
    }
  }

  async verifyAddress(coin: string, address: string): Promise<boolean> {
    const result = await this.bitGoService.isValidAddress(coin, address)

    return result.isValid
  }
}

export enum OnChainToken {
  AVAXC_NATIVE = 'avaxc',
  TAVAXC_NATIVE = 'tavaxc',

  TAVAXC_LINK = 'tavaxc:link',
  AVAXC_USDC = 'avaxc:usdc',
}

export enum OnChainBaseCoin {
  AVAXC = 'avaxc',
  TAVAXC = 'tavaxc',
}

export const SupportedOnChainToken = Object.values(OnChainToken)
export const SupportedOnChainNetwork = Object.values(OnChainBaseCoin)

class TokenConfig {
  constructor(public readonly precision: number) {}

  get exponent() {
    return new BigNumber(10).pow(this.precision)
  }
}

// See https://developers.bitgo.com/coins
export const OnChainTokenConfig: Record<OnChainToken, TokenConfig> = Object.freeze({
  [OnChainToken.AVAXC_NATIVE]: new TokenConfig(18),
  [OnChainToken.TAVAXC_NATIVE]: new TokenConfig(18),

  [OnChainToken.TAVAXC_LINK]: new TokenConfig(18),
  [OnChainToken.AVAXC_USDC]: new TokenConfig(6),
})
