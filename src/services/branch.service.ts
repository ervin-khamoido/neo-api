2021

import { inject, injectable, named } from 'inversify'
import { HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'

import { IUrlRequest } from '../models/branchio'
import { BranchIOConfigSymbol, IBranchIOConfig } from '../models/config'
import { UrlResponse } from '../models/branchio/url.response'

export interface IBranchIOService {
  link(payload: IUrlRequest): Promise<UrlResponse>
}

export const BranchIOServiceSymbol = Symbol.for('IBranchIOService')

@injectable()
export class BranchIOService implements IBranchIOService {
  @inject(BranchIOConfigSymbol) config!: IBranchIOConfig

  @named('branchio') @inject(HttpTransportSymbol) http!: IHttpTransport

  async link(payload: IUrlRequest): Promise<UrlResponse> {
    const body = {
      ...payload,
      branch_key: this.config.key,
    }

    return this.http.post('/url', { body, Model: UrlResponse })
  }
}
