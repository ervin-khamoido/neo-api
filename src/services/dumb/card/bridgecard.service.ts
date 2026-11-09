2023

import { inject, injectable, named } from 'inversify'
import { HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import read from '@ts-awesome/model-reader'
import { sleep } from '../../../utils/sleep'
import { StatusCode } from '../../../errors'

import {
  CardDetails,
  CardHolderDetails,
  CreateCardHolderRequest,
  CreateCardHolderResponse,
  CreateCardRequest,
  CreateCardResponse,
  FreezeCardResponse,
  UnfreezeCardResponse,
  DeleteCardHolderResponse,
  FundCardRequest,
  GetCardTransactionResponse,
  CardTransactionInfo,
  GetCardTransactionStatus,
  FundCardResponse,
  IFundCardResult,
  FundCardResultProcess,
  UnloadCardInfo,
  UnloadCardRequest,
  UnloadCardResponse,
  UnloadCardStatus,
  CardBalance,
} from '../../../models/bridgecard'
import { BridgeCardConfigSymbol, IBridgeCardConfig } from '../../../models/config'

export interface IBridgeCardService {
  getCardHolderDetails(providerCardHolderId: string): Promise<CardHolderDetails>
  getCardDetails(providerCardId: string): Promise<CardDetails>
  getCardBalance(providerCardId: string): Promise<CardBalance>
  getDecryptedCardDetails(providerCardId: string): Promise<CardDetails>

  createCardHolder(payload: CreateCardHolderRequest): Promise<string>
  createCard(payload: CreateCardRequest): Promise<string>

  freezeCard(providerCardId: string): Promise<void>
  unfreezeCard(providerCardId: string): Promise<void>

  fundCard(payload: FundCardRequest): Promise<IFundCardResult>

  /**
   * Sends the request to fetch transaction by external reference
   *
   * @param providerCardId card identifier
   * @param transactionReference external reference
   * @returns {CardTransactionInfo} The transaction info or undefined
   * @throws {Error} if the response is not successful
   */
  getCardTransaction(providerCardId: string, transactionReference: string): Promise<CardTransactionInfo | undefined>

  deleteCardHolder(providerCardHolderId: string): Promise<void>

  unloadCard(payload: UnloadCardRequest): Promise<UnloadCardInfo>
}

export const BridgeCardServiceSymbol = Symbol.for('IBridgeCardService')

@injectable()
export class BridgeCardService implements IBridgeCardService {
  @named('bridgecard')
  @inject(HttpTransportSymbol)
  http!: IHttpTransport

  @named('bridgecard-vault')
  @inject(HttpTransportSymbol)
  vaultHttp!: IHttpTransport

  @inject(BridgeCardConfigSymbol) bridgeCardConfig!: IBridgeCardConfig

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(BridgeCardService)
  }

  /**
   * Sends the request to fund card in BridgeCard
   * @param payload The information needed to create a transaction
   * @returns The funding result
   */
  async fundCard(payload: FundCardRequest): Promise<IFundCardResult> {
    const headers = this.getHeaders()
    const response = await this.retryRequest(() =>
      this.http.request('PATCH', '/cards/fund_card', {
        body: payload,
        headers: headers,
      }),
    )

    const resultObject = await response.json()
    const fundCardResponse = read(resultObject, FundCardResponse, false)

    if (!fundCardResponse) {
      throw new Error(`unexpected: bridgecard response is empty`)
    }

    let processed = null
    switch (response.status) {
      case StatusCode.OK: {
        processed = FundCardResultProcess.Immediate
        break
      }
      case StatusCode.Accepted: {
        processed = FundCardResultProcess.Delayed
        break
      }
      default: {
        throw new Error(
          `unexpected: bridgecard status code (${response.status}: ${response.statusText}) is not supported`,
        )
      }
    }

    return {
      processed: processed,
      data: fundCardResponse.data!,
    }
  }

  async getCardTransaction(
    providerCardId: string,
    transactionReference: string,
  ): Promise<CardTransactionInfo | undefined> {
    const headers = this.getHeaders()

    const response = await this.retryRequest(() =>
      this.http.get('/cards/get_card_transaction_by_id', {
        qs: {
          card_id: providerCardId,
          client_transaction_reference: transactionReference,
        },
        Model: GetCardTransactionResponse,
        headers: headers,
      }),
    )

    if (response.status !== GetCardTransactionStatus.Success) {
      this.logger.error(JSON.stringify(response))
      throw new Error(response.message)
    }

    return response.data
  }

  /**
   * Gets the cardholder details from BridgeCard
   * @param providerCardHolderId The cardholder ID
   * @returns The cardholder details response
   */
  async getCardHolderDetails(providerCardHolderId: string): Promise<CardHolderDetails> {
    const headers = this.getHeaders()

    const response = await this.retryRequest(() =>
      this.http.get(`/cardholder/get_cardholder?cardholder_id=${providerCardHolderId}`, {
        Model: CardHolderDetails,
        headers: headers,
      }),
    )

    // Return the cardholder details response
    return response
  }

  /**
   * Gets the card details from BridgeCard
   * @param providerCardId The card ID
   * @returns The card details response
   */
  async getCardDetails(providerCardId: string): Promise<CardDetails> {
    const headers = this.getHeaders()

    const response = await this.retryRequest(() =>
      this.http.get(`/cards/get_card_details?card_id=${providerCardId}`, {
        Model: CardDetails,
        headers: headers,
      }),
    )

    // Return the card details
    return response
  }

  /**
   * Gets the card balance from BridgeCard
   *
   * @param providerCardId The card ID
   * @returns The card balance response
   */
  async getCardBalance(providerCardId: string): Promise<CardBalance> {
    const headers = this.getHeaders()

    const response = await this.retryRequest(() =>
      this.http.get(`/cards/get_card_balance?card_id=${providerCardId}`, {
        Model: CardBalance,
        headers: headers,
      }),
    )

    // Return the card details
    return response
  }

  /**
   * Gets the card details from BridgeCard
   * @param providerCardHolderId The card ID
   * @returns The card details response
   */
  async getDecryptedCardDetails(providerCardId: string): Promise<CardDetails> {
    const headers = this.getHeaders()

    const response = await this.retryRequest(() =>
      this.vaultHttp.get(`/cards/get_card_details?card_id=${providerCardId}`, {
        Model: CardDetails,
        headers: headers,
      }),
    )

    // Return the card details
    return response
  }

  /**
   * Sends the request to create a cardholder in BridgeCard
   * @param payload The information needed to create a cardholder
   * @returns The cardholder ID from BridgeCard
   */
  async createCardHolder(payload: CreateCardHolderRequest): Promise<string> {
    const body = { ...payload }
    const headers = this.getHeaders()

    const response = await this.retryRequest(() =>
      this.http.post('/cardholder/register_cardholder', {
        body,
        Model: CreateCardHolderResponse,
        headers: headers,
      }),
    )

    // Return the cardholder ID
    return response.data.cardholder_id
  }

  /**
   * Sends the request to create a card in BridgeCard
   * @param payload The information needed to create a card
   * @returns The card ID from BridgeCard
   */
  async createCard(payload: CreateCardRequest): Promise<string> {
    const body = { ...payload }
    const headers = this.getHeaders()

    const response = await this.retryRequest(() =>
      this.http.post('/cards/create_card', {
        body,
        Model: CreateCardResponse,
        headers: headers,
      }),
    )

    // Return the card ID
    return response.data.card_id
  }

  /**
   * Freezes a card in BridgeCard
   * @param providerCardId The card ID
   */
  async freezeCard(providerCardId: string): Promise<void> {
    const headers = this.getHeaders()

    await this.retryRequest(() =>
      this.http.patch(`/cards/freeze_card?card_id=${providerCardId}`, {
        Model: FreezeCardResponse,
        headers: headers,
      }),
    )
  }

  /**
   * Unfreezes a card in BridgeCard
   * @param providerCardId The card ID
   */
  async unfreezeCard(providerCardId: string): Promise<void> {
    const headers = this.getHeaders()

    await this.retryRequest(() =>
      this.http.patch(`/cards/unfreeze_card?card_id=${providerCardId}`, {
        Model: UnfreezeCardResponse,
        headers: headers,
      }),
    )
  }

  /**
   * Deletes a cardholder in BridgeCard
   * @param providerCardHolderId The cardholder ID
   */
  async deleteCardHolder(providerCardHolderId: string): Promise<void> {
    const headers = this.getHeaders()

    await this.retryRequest(() =>
      this.http.delete(`/cardholder/delete_cardholder/${providerCardHolderId}`, {
        Model: DeleteCardHolderResponse,
        headers: headers,
      }),
    )
  }

  async unloadCard(payload: UnloadCardRequest): Promise<UnloadCardInfo> {
    const headers = this.getHeaders()

    const response = await this.retryRequest(() =>
      this.http.patch('/cards/unload_card', {
        body: payload,
        headers: headers,
        Model: UnloadCardResponse,
      }),
    )

    if (response.status !== UnloadCardStatus.Success) {
      throw new Error(response.message)
    }

    return response.data!
  }

  /**
   * Use this method to get the BridgeCard headers needed for the request
   * @returns A record object of headers for the request
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      token: `Bearer ${this.bridgeCardConfig.apiAuthToken}`,
    }

    return headers
  }

  /**
   * Retries the HTTP requests to ensure
   * @param request
   * @param retryCounter
   * @returns
   */
  private async retryRequest<T>(request: () => Promise<T>, retryCounter = 1): Promise<T> {
    const maxRetryCount = 3
    const retryTimeoutMs = 850

    try {
      return await request()
    } catch (err: any) {
      // NOTE: 429 is the default rate limit status code
      // NOTE: 422 is the status code provided by bridgecard for rate limit errors
      // If rate limit exceeded retry this request
      const isRetryStatusCode = [422, 429].indexOf(err.statusCode) > -1

      if (isRetryStatusCode && retryCounter <= maxRetryCount) {
        const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
        this.logger.error(errorMessage)
        this.logger.info(`Retrying previous Bridgecard request in ${retryTimeoutMs} ms. Retry attempt: ${retryCounter}`)

        await sleep(retryTimeoutMs)

        return await this.retryRequest(request, retryCounter + 1)
      }

      throw err
    }
  }
}
