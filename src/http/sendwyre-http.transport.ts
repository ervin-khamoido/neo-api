import { HttpTransportBase } from '@ts-awesome/request/dist/http.transport.base'
import { HttpMethod, ILogger, Options } from '@ts-awesome/request/dist/interfaces'
import { fetch } from 'cross-fetch'
import CryptoJS from 'crypto-js'
import { ISendwyreConfig } from '../models/config/sendwyre.config'

export class SendwyreHttpTransport extends HttpTransportBase<Options, Response> {
  protected logger?: ILogger | undefined
  protected config: ISendwyreConfig

  constructor(config: ISendwyreConfig, logger?: ILogger | undefined) {
    super(fetch, logger, config.url)
    this.config = config
    this.logger = logger
  }

  request(
    method: HttpMethod,
    uri: string,
    options?: Options & {
      timeout?: number
    },
  ): Promise<Response> {
    const timestamp = new Date().getTime()
    const updatedUri = uri.indexOf('?') === -1 ? `${uri}?timestamp=${timestamp}` : `${uri}&timestamp=${timestamp}`
    const fullUrl = `${this.resolveRelativeUrl(method, updatedUri)}`
    const signature = this.getSignature(this.config.secret, fullUrl, options?.body)

    options = options || {}
    options.headers = options.headers || {}
    options.headers['X-Api-Key'] = this.config.key
    options.headers['X-Api-Signature'] = signature

    return super.request(method, updatedUri, options)
  }

  private getSignature(secret: string, url: string, payload?: any | undefined): string {
    const data = payload ? url + JSON.stringify(payload) : url
    const hash = CryptoJS.HmacSHA256(data, secret)
    return CryptoJS.enc.Hex.stringify(hash)
  }
}
