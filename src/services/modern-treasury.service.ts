2021

import { inject, injectable, named } from 'inversify'
import { HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import {
  AccountCreateRequest,
  AccountResponse,
  TransactionCreateRequest,
  TransactionResponse,
  WalletType,
} from '../models/modern-treasury'
import currency from 'currency.js'
import { DecimalPlacesConfig } from '../models/calculator'
import { sleep } from '../utils/sleep'
import { format } from 'date-fns-tz'
import read from '@ts-awesome/model-reader'
import { ITransactionUpdateRequest } from '../models/modern-treasury/transaction-update.request'
import { IModernTreasuryConfig, ModernTreasuryConfigSymbol } from '../models/config'

export const ACCOUNT_CONFIG = new DecimalPlacesConfig(6)

export interface ICursorBasedResult<T> {
  cursor: string | null
  pageSize: number
  items: T[]
}

export function fromModernTreasuryAmount(modernTreasuryAmount: number): number {
  return currency(modernTreasuryAmount, { precision: ACCOUNT_CONFIG.decimalPlaces }).divide(
    ACCOUNT_CONFIG.decimalMultiplier,
  ).value
}

export function toModernTreasuryAmount(normalAmount: number): number {
  return currency(normalAmount, { precision: ACCOUNT_CONFIG.decimalPlaces }).multiply(ACCOUNT_CONFIG.decimalMultiplier)
    .value
}

export interface IModernTreasuryService {
  createAccount(payload: AccountCreateRequest): Promise<AccountResponse>
  getAccount(id: string): Promise<AccountResponse>
  getYieldAccount(user: string): Promise<AccountResponse | null>
  getSystemAccount(ledgerId: string): Promise<AccountResponse | null>
  getIncomingAccount(user: string): Promise<AccountResponse | null>
  getIncomingAccounts(
    ledgerId: string,
    pageSize: number,
    cursor?: string | null,
  ): Promise<ICursorBasedResult<AccountResponse>>
  getAccountsOfType(
    type: WalletType,
    ledgerId: string,
    pageSize: number,
    cursor?: string | null,
  ): Promise<ICursorBasedResult<AccountResponse>>
  getAccountsByIds(ledgerId: string, ids: string[]): Promise<AccountResponse[]>

  getCardAccount(user: string): Promise<AccountResponse | null>
  getSystemCardNetworkAccount(): Promise<AccountResponse | null>
  getSystemCryptoNetworkAccount(): Promise<AccountResponse | null>

  createTransaction(payload: TransactionCreateRequest): Promise<TransactionResponse>
  getTransaction(mtTransactionId: string): Promise<TransactionResponse>
  findTransaction(mtTransactionId: string): Promise<TransactionResponse | null>
  updateTransaction(mtTransactionId: string, payload: ITransactionUpdateRequest): Promise<TransactionResponse>
  findTransactionsByExternalId(externalId: string): Promise<TransactionResponse[] | null>
  getTransactionEffectiveDate(date: Date): string
  updateTransaction(id: string, payload: ITransactionUpdateRequest): Promise<TransactionResponse>

  closeAccount(id: string): Promise<void>
  closeYieldAccount(user: string): Promise<void>
  closeIncomingAccount(user: string): Promise<void>
  closeCardAccount(user: string): Promise<void>

  blockAccount(id: string): Promise<void>
  unblockAccount(id: string): Promise<void>
  blockYieldAccount(user: string): Promise<void>
  unblockYieldAccount(user: string): Promise<void>
  blockCardAccount(user: string): Promise<void>
  unblockCardAccount(user: string): Promise<void>
  // blockIncomingAccount(user: string): Promise<void>
}

const RetryCount = 3
const RetryTimeoutMs = 850
export const ModernTreasuryServiceSymbol = Symbol.for('IModernTreasuryService')

@injectable()
export class ModernTreasuryService implements IModernTreasuryService {
  @named('modern-treasury')
  @inject(HttpTransportSymbol)
  http!: IHttpTransport

  @inject(ModernTreasuryConfigSymbol) modernTreasuryConfig!: IModernTreasuryConfig

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(ModernTreasuryService)
  }

  async createAccount(payload: AccountCreateRequest): Promise<AccountResponse> {
    const body = { ...payload }

    return await this.retryRequest(() => this.http.post('/api/ledger_accounts', { body, Model: AccountResponse }))
  }

  async getAccount(id: string): Promise<AccountResponse> {
    return await this.retryRequest(() => this.http.get(`/api/ledger_accounts/${id}`, { Model: AccountResponse }))
  }

  async getYieldAccount(user: string): Promise<AccountResponse | null> {
    const response: AccountResponse[] = await this.http.get('/api/ledger_accounts', {
      qs: {
        'metadata[owner]': user,
        'metadata[type]': WalletType.Yield,
      },
    })

    if (!response || response.length === 0) {
      return null
    }

    if (response.length > 1) {
      this.logger.error('critical: the user has more than one yield account')
    }

    return response[0]
  }

  async getIncomingAccount(user: string): Promise<AccountResponse | null> {
    const response: AccountResponse[] = await this.retryRequest(() =>
      this.http.get('/api/ledger_accounts', {
        qs: {
          'metadata[owner]': user,
          'metadata[type]': WalletType.Incoming,
        },
      }),
    )

    if (!response || response.length === 0) {
      return null
    }

    if (response.length > 1) {
      this.logger.error('critical: the user has more than one incoming account')
    }

    return response[0]
  }

  async getCardAccount(user: string): Promise<AccountResponse | null> {
    const response: AccountResponse[] = await this.retryRequest(() =>
      this.http.get('/api/ledger_accounts', {
        qs: {
          'metadata[owner]': user,
          'metadata[type]': WalletType.Card,
        },
      }),
    )

    if (!response || response.length === 0) {
      return null
    }

    if (response.length > 1) {
      this.logger.error('critical: the user has more than one card account')
    }

    return response[0]
  }

  async getIncomingAccounts(
    ledgerId: string,
    pageSize: number,
    cursor?: string | null,
  ): Promise<ICursorBasedResult<AccountResponse>> {
    return this.getAccountsOfType(WalletType.Incoming, ledgerId, pageSize, cursor)
  }

  async getAccountsOfType(type: WalletType, ledgerId: string, pageSize: number, cursor?: string | null) {
    if (pageSize > 100) {
      throw new Error(`unsupported page size ${pageSize}. pageSize should be less than or equal to 100`)
    }

    let queryString = {
      ledger_id: ledgerId,
      per_page: pageSize,
      'metadata[type]': type,
    }

    if (!!cursor) {
      queryString['after_cursor'] = cursor
    }

    const response = await this.retryRequest(() =>
      this.http.request('GET', '/api/ledger_accounts', {
        qs: queryString,
      }),
    )

    const nextCursor = response.headers?.get('x-after-cursor')
    const resultObject = await response.json()
    const items = read(resultObject, [AccountResponse], false)

    return {
      pageSize: pageSize,
      cursor: nextCursor,
      items: items ?? [],
    }
  }

  async getAccountsByIds(ledgerId: string, ids: string[]): Promise<AccountResponse[]> {
    const idsQS = ids.map(x => `id[]=${x}`).join('&')

    const response: AccountResponse[] = await this.retryRequest(() =>
      this.http.get(`/api/ledger_accounts?${idsQS}&ledger_id=${ledgerId}`),
    )

    return response
  }

  async closeAccount(id: string): Promise<void> {
    const body = {
      metadata: {
        type: WalletType.DeletedSaving,
      },
    }

    await this.retryRequest(() => this.http.patch(`/api/ledger_accounts/${id}`, { body, Model: AccountResponse }))
  }

  async closeYieldAccount(user: string): Promise<void> {
    const yieldAccount = await this.getYieldAccount(user)
    if (!yieldAccount) {
      return
    }

    const body = {
      metadata: {
        type: WalletType.DeletedYield,
      },
    }

    await this.retryRequest(() =>
      this.http.patch(`/api/ledger_accounts/${yieldAccount.id}`, { body, Model: AccountResponse }),
    )
  }

  async closeIncomingAccount(user: string): Promise<void> {
    const incomingAccount = await this.getIncomingAccount(user)
    if (!incomingAccount) {
      return
    }

    const body = {
      metadata: {
        type: WalletType.DeletedIncoming,
      },
    }

    await this.retryRequest(() =>
      this.http.patch(`/api/ledger_accounts/${incomingAccount.id}`, { body, Model: AccountResponse }),
    )
  }

  async closeCardAccount(user: string): Promise<void> {
    const incomingAccount = await this.getCardAccount(user)
    if (!incomingAccount) {
      return
    }

    const body = {
      metadata: {
        type: WalletType.DeletedCard,
      },
    }

    await this.retryRequest(() =>
      this.http.patch(`/api/ledger_accounts/${incomingAccount.id}`, { body, Model: AccountResponse }),
    )
  }

  async blockAccount(id: string): Promise<void> {
    const body = {
      metadata: {
        type: WalletType.BlockedSaving,
      },
    }

    await this.retryRequest(() => this.http.patch(`/api/ledger_accounts/${id}`, { body, Model: AccountResponse }))
  }

  async unblockAccount(id: string): Promise<void> {
    const body = {
      metadata: {
        type: WalletType.Saving,
      },
    }

    await this.retryRequest(() => this.http.patch(`/api/ledger_accounts/${id}`, { body, Model: AccountResponse }))
  }

  async blockYieldAccount(user: string): Promise<void> {
    const yieldAccount = await this.getYieldAccount(user)
    if (!yieldAccount) {
      return
    }

    const body = {
      metadata: {
        type: WalletType.BlockedYield,
      },
    }

    await this.retryRequest(() =>
      this.http.patch(`/api/ledger_accounts/${yieldAccount.id}`, { body, Model: AccountResponse }),
    )
  }

  async unblockYieldAccount(user: string): Promise<void> {
    const yieldAccount = await this.getBlockedYieldAccount(user)
    if (!yieldAccount) {
      return
    }

    const body = {
      metadata: {
        type: WalletType.Yield,
      },
    }

    await this.retryRequest(() =>
      this.http.patch(`/api/ledger_accounts/${yieldAccount.id}`, { body, Model: AccountResponse }),
    )
  }

  async blockCardAccount(user: string): Promise<void> {
    const yieldAccount = await this.getCardAccount(user)
    if (!yieldAccount) {
      return
    }

    const body = {
      metadata: {
        type: WalletType.BlockedCard,
      },
    }

    await this.retryRequest(() =>
      this.http.patch(`/api/ledger_accounts/${yieldAccount.id}`, { body, Model: AccountResponse }),
    )
  }

  async unblockCardAccount(user: string): Promise<void> {
    const yieldAccount = await this.getBlockedCardAccount(user)
    if (!yieldAccount) {
      return
    }

    const body = {
      metadata: {
        type: WalletType.Card,
      },
    }

    await this.retryRequest(() =>
      this.http.patch(`/api/ledger_accounts/${yieldAccount.id}`, { body, Model: AccountResponse }),
    )
  }

  // TODO: update once we need to block incoming wallet
  // blockIncomingAccount(user: string): Promise<void> {
  //   // we don't know if we want to block incoming operations
  //   // leave it empty for now
  //   this.logger.info(`Incoming wallet is not blocked for user: ${user}. No behavior specified`)
  //   return Promise.resolve()
  // }

  getTransactionEffectiveDate(date: Date): string {
    return format(date, 'yyyy-MM-dd', { timeZone: 'GMT' })
  }

  async createTransaction(payload: TransactionCreateRequest): Promise<TransactionResponse> {
    const body = { ...payload }

    return await this.retryRequest(() =>
      this.http.post(`/api/ledger_transactions`, { body, Model: TransactionResponse }),
    )
  }

  // NOTE: we can update only metadata for the Posted transaction
  async updateTransaction(id: string, payload: ITransactionUpdateRequest): Promise<TransactionResponse> {
    const body = { ...payload }

    return await this.retryRequest(() =>
      this.http.patch(`/api/ledger_transactions/${id}`, { body, Model: TransactionResponse }),
    )
  }

  async getTransaction(mtTransactionId: string): Promise<TransactionResponse> {
    return await this.retryRequest(() =>
      this.http.get(`/api/ledger_transactions/${mtTransactionId}`, { Model: TransactionResponse }),
    )
  }

  async findTransaction(mtTransactionId: string): Promise<TransactionResponse | null> {
    try {
      return await this.getTransaction(mtTransactionId)
    } catch (err: any) {
      // listen only for 404 error
      // 404 error has an object response, code = resource_not_found
      const errorCode = err.errors?.code
      if (errorCode === 'resource_not_found') {
        return null
      }

      throw err
    }
  }

  async findTransactionsByExternalId(externalId: string): Promise<TransactionResponse[] | null> {
    return await this.retryRequest(async () => {
      const response: TransactionResponse[] = await this.http.get(`api/ledger_transactions`, {
        qs: {
          external_id: externalId,
        },
      })

      if (!response || response.length === 0) {
        return null
      }

      return response
    })
  }

  async getSystemAccount(ledgerId: string): Promise<AccountResponse | null> {
    const response: AccountResponse[] = await this.retryRequest(() =>
      this.http.get('/api/ledger_accounts', {
        qs: {
          ledger_id: ledgerId,
          'metadata[type]': WalletType.System,
        },
      }),
    )

    if (!response || response.length === 0) {
      return null
    }

    if (response.length > 1) {
      throw new Error(`critical: more than one system account found`)
    }

    return response[0]
  }

  async getSystemCardNetworkAccount(): Promise<AccountResponse | null> {
    const { ledgerId } = this.modernTreasuryConfig
    const response: AccountResponse[] = await this.retryRequest(() =>
      this.http.get('/api/ledger_accounts', {
        qs: {
          ledger_id: ledgerId,
          'metadata[type]': WalletType.CardNetwork,
        },
      }),
    )

    if (!response || response.length === 0) {
      return null
    }

    if (response.length > 1) {
      throw new Error(`critical: more than one card network account found`)
    }

    return response[0]
  }

  async getSystemCryptoNetworkAccount(): Promise<AccountResponse | null> {
    const { ledgerId } = this.modernTreasuryConfig
    const response: AccountResponse[] = await this.retryRequest(() =>
      this.http.get('/api/ledger_accounts', {
        qs: {
          ledger_id: ledgerId,
          'metadata[type]': WalletType.SystemCryptoNetwork,
        },
      }),
    )

    if (!response || response.length === 0) {
      return null
    }

    if (response.length > 1) {
      throw new Error(`critical: more than one card network account found`)
    }

    return response[0]
  }

  private async retryRequest<T>(request: () => Promise<T>, retryCounter = 1): Promise<T> {
    try {
      return await request()
    } catch (err: any) {
      // if rate limit exceeded retry this request
      if (err.status === 429 && retryCounter <= RetryCount) {
        const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
        this.logger.error(errorMessage)
        this.logger.info(
          `Retrying previous ModernTreasury request in ${RetryTimeoutMs} ms. Retry attempt: ${retryCounter}`,
        )
        await sleep(RetryTimeoutMs)

        return await this.retryRequest(request, retryCounter + 1)
      }

      throw err
    }
  }

  private async getBlockedYieldAccount(user: string): Promise<AccountResponse | null> {
    const response: AccountResponse[] = await this.http.get('/api/ledger_accounts', {
      qs: {
        'metadata[owner]': user,
        'metadata[type]': WalletType.BlockedYield,
      },
    })

    if (!response || response.length === 0) {
      return null
    }

    if (response.length > 1) {
      this.logger.error('critical: the user has more than one yield account')
    }

    return response[0]
  }

  private async getBlockedCardAccount(user: string): Promise<AccountResponse | null> {
    const response: AccountResponse[] = await this.http.get('/api/ledger_accounts', {
      qs: {
        'metadata[owner]': user,
        'metadata[type]': WalletType.BlockedCard,
      },
    })

    if (!response || response.length === 0) {
      return null
    }

    if (response.length > 1) {
      this.logger.error('critical: the user has more than one yield account')
    }

    return response[0]
  }
}
