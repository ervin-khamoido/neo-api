2021

import { inject, injectable, named } from 'inversify'
import { HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { AccountNumberResolveInput, AccountNumberResolveOutput } from '../models/paystack'
import { PaystackBankOutput, PaystackBankResponse } from '../models/paystack/paystack-bank.output'
import { sleep } from '../utils/sleep'

export enum PaystackCountryCode {
  Nigeria = 'nigeria',

  // uncomment when needed
  // Ghana = 'ghana',
}

export interface IPaystackService {
  resolveAccountNumber(payload: AccountNumberResolveInput): Promise<AccountNumberResolveOutput>
  getAllBanks(country: PaystackCountryCode): Promise<PaystackBankOutput[]>
}

export const PaystackServiceSymbol = Symbol.for('IPaystackService')

@injectable()
export class PaystackService implements IPaystackService {
  @named('paystack') @inject(HttpTransportSymbol) http!: IHttpTransport

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(PaystackService)
  }

  async getAllBanks(country: PaystackCountryCode): Promise<PaystackBankOutput[]> {
    let cursor = null
    let banks: PaystackBankOutput[] = []
    do {
      const response: PaystackBankResponse = await this.getBanksPage(country, 50, cursor)
      const pagedBanks = (response.data?.length ? response.data[0] : []) ?? []
      pagedBanks.forEach(b => banks.push(b))

      if (!response.status) {
        this.logger.error(
          `unexpected: could not retrieve banks paged data from Paystack. Cursor: ${cursor}. Message: ${response.message}`,
        )
        throw new Error('Unexpected: could not retrieve banks paged data from Paystack')
      }

      cursor = response.meta?.next

      // trickle page requests so we don't stress the Paystack API
      // 400ms is a subjective value and might be changed in the future
      if (cursor) {
        await sleep(400)
      }
    } while (!!cursor)

    return banks
  }

  // https://paystack.com/docs/api/miscellaneous#bank
  private async getBanksPage(
    country: PaystackCountryCode,
    pageSize: number,
    cursor?: string | null,
  ): Promise<PaystackBankResponse> {
    if (pageSize > 100) {
      throw new Error(`unsupported page size ${pageSize}. pageSize should be less than or equal to 100`)
    }

    return await this.http.get('/bank', {
      qs: {
        country: country,
        use_cursor: true,
        perPage: pageSize,
        next: cursor ?? '',
      },
      Model: PaystackBankResponse,
    })
  }

  async resolveAccountNumber(payload: AccountNumberResolveInput): Promise<AccountNumberResolveOutput> {
    try {
      return await this.http.get('/bank/resolve', {
        qs: {
          account_number: payload.accountNumber,
          bank_code: payload.bankCode,
        },
        Model: AccountNumberResolveOutput,
      })
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)

      return {
        status: false,
        message: 'Could not resolve account name. Check parameters or try again.',
      }
    }
  }
}
