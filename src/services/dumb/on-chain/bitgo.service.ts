2023

import { HttpTransportSymbol, IHttpTransport, RequestError } from '@ts-awesome/request'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { inject, injectable, named } from 'inversify'
import https from 'https'

import { BitGoAPI } from '@bitgo/sdk-api'
import * as bitGoSdk_CoinAvaxC from '@bitgo/sdk-coin-avaxc'

import { ICreateAddressInput } from './models/bitgo.input'
import { BitGoConfigSymbol, IBitGoConfig } from '../../../models/config'
import { CreateAddressOutput } from './models/create-address.output'
import { AddressOutput } from './models/address-output'
import { BitgoError } from './models/bitgo.error'
import { TransferOutput } from './models/transfer.output'
import { AddressValidationOutput } from './models/address-validation.output'

import { PrebuiltTransactionOutput } from './models/prebuilt-transaction.output'

export interface IBitGoService {
  createAddress(coin: string, wallet: string, payload: ICreateAddressInput): Promise<CreateAddressOutput>
  getAddress(coin: string, wallet: string, address: string): Promise<AddressOutput>

  getTransfer(transferId: string, coin: string, wallet: string): Promise<TransferOutput>

  getWalletAddress(coin: string, walletId: string): Promise<string>

  /**
   * Prebuilds a BitGo send transaction, which can later be submitted to actually send money on-chain.
   * @param coin The coin (ex: tavaxc:link, avaxc:usdc)
   * @param toAddress The address to send the funds to
   * @param amount The amount in integer format, sent as a string (ex: 1.00 -> `1000000000000000000`)
   * @returns The prebuild transaction returned from the BitGo SDK
   */
  prebuildTransaction(coin: string, toAddress: string, amount: string): Promise<PrebuiltTransactionOutput>

  /**
   * Signs and submits a transaction to BitGo to be sent on-chain. Call @method prebuildTransaction first to get the transaction to submit.
   * @param coin The coin (ex: tavaxc:link, avaxc:usdc)
   * @param prebuildTx The prebuild transaction from @method prebuildTransaction
   * @returns The Transfer output or null if the transfer is for some reason not on the result object
   */
  submitTransaction(coin: string, prebuildTx: any): Promise<TransferOutput | null>

  isValidAddress(coin: string, address: string): Promise<AddressValidationOutput>
}

export const BitGoServiceSymbol = Symbol.for('IBitGoService')

@injectable()
export class BitGoService implements IBitGoService {
  @named('bitgo') @inject(HttpTransportSymbol) http!: IHttpTransport

  private logger: ILogger
  private bitgoSDK: BitGoAPI
  private bitGoConfig

  constructor(
    @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory,
    @inject(BitGoConfigSymbol) bitGoConfig: IBitGoConfig,
  ) {
    this.logger = loggerFactory(BitGoService)
    this.bitGoConfig = bitGoConfig

    this.bitgoSDK = new BitGoAPI({ customRootURI: this.bitGoConfig.apiUrl, accessToken: this.bitGoConfig.apiToken })
    bitGoSdk_CoinAvaxC.register(this.bitgoSDK)
  }

  async createAddress(coin: string, wallet: string, payload: ICreateAddressInput): Promise<CreateAddressOutput> {
    const body = { ...payload }

    try {
      return await this.http.post(
        `/api/v2/${coin}/wallet/${wallet}/address`,
        this.getDefaultHttpOptions({
          body,
          Model: CreateAddressOutput,
        }),
      )
    } catch (err: unknown) {
      if (err instanceof RequestError) {
        throw new BitgoError('Third Party Failure', err.data)
      }

      throw err
    }
  }

  async getAddress(coin: string, wallet: string, address: string): Promise<AddressOutput> {
    try {
      return await this.http.get(
        `/api/v2/${coin}/wallet/${wallet}/address/${address}`,
        this.getDefaultHttpOptions({
          Model: AddressOutput,
        }),
      )
    } catch (err) {
      if (err instanceof RequestError) {
        throw new BitgoError('Third Party Failure', err.data)
      }

      throw err
    }
  }

  async getTransfer(transferId: string, coin: string, wallet: string): Promise<TransferOutput> {
    try {
      return await this.http.get(
        `/api/v2/${coin}/wallet/${wallet}/transfer/${transferId}`,
        this.getDefaultHttpOptions({
          Model: TransferOutput,
        }),
      )
    } catch (err) {
      if (err instanceof RequestError) {
        throw new BitgoError('Third Party Failure', err.data)
      }

      throw err
    }
  }

  async isValidAddress(coin: string, address: string): Promise<AddressValidationOutput> {
    try {
      const result = await this.bitgoSDK.coin(coin).isValidAddress(address)

      return {
        isValid: result,
      }
    } catch (err: any) {
      if (err instanceof RequestError) {
        throw new BitgoError('Third Party Failure', err.data)
      }

      throw err
    }
  }

  async prebuildTransaction(coin: string, toAddress: string, amount: string): Promise<PrebuiltTransactionOutput> {
    try {
      const wallet = await this.bitgoSDK.coin(coin).wallets().get({ id: this.bitGoConfig.inOutWalletId })
      const calculatedTransaction = await wallet.prebuildTransaction({
        recipients: [
          {
            amount: amount,
            address: toAddress,
          },
        ],
      })

      return calculatedTransaction as any
    } catch (err: any) {
      if (err instanceof RequestError) {
        throw new BitgoError('Third Party Failure', err.data)
      }

      throw err
    }
  }

  async submitTransaction(coin: string, prebuildTx: any): Promise<TransferOutput | null> {
    try {
      const wallet = await this.bitgoSDK.coin(coin).wallets().get({ id: this.bitGoConfig.inOutWalletId })
      const signedTransaction = await wallet.signTransaction({
        keychain: {
          encryptedPrv: this.bitGoConfig.inOutWalletEncryptedPRV,
        },
        txPrebuild: prebuildTx,
        walletPassphrase: this.bitGoConfig.inOutWalletPassphrase,
      })

      const result = await wallet.submitTransaction(signedTransaction)

      return result?.transfer ?? null
    } catch (err: any) {
      if (err instanceof RequestError) {
        throw new BitgoError('Third Party Failure', err.data)
      }

      throw err
    }
  }

  async getWalletAddress(coin: string, walletId: string): Promise<string> {
    const wallet = await this.bitgoSDK.coin(coin).wallets().get({ id: this.bitGoConfig.inOutWalletId })

    return wallet.receiveAddress()
  }

  private getDefaultHttpOptions<TOptions>(options: TOptions): TOptions {
    if (!this.bitGoConfig.allowProxySelfSigned) {
      return options
    }

    const nonRequiredHttpsAgent = new https.Agent({
      rejectUnauthorized: false,
    })

    const modifiedOptions = options ?? ({} as TOptions)
    if (modifiedOptions) {
      ;(modifiedOptions as any).agent = nonRequiredHttpsAgent
    }

    return modifiedOptions
  }
}
