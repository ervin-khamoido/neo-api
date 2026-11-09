2021

import { inject, injectable, named } from 'inversify'
import { Readable } from 'stream'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'

import crypto from 'crypto'

import { AccessTokenRequest, AccessTokenResponse, ApplicantDataResponse } from '../models/sumsub'
import { ISumsubConfig, SumsubConfigSymbol } from '../models/config'
import { IApplicantStatusResponse } from '../models/sumsub/applicant-status.response'

export interface ISumsubService {
  createAccessToken(payload: AccessTokenRequest): Promise<AccessTokenResponse>
  getApplicantData(applicantId: string): Promise<ApplicantDataResponse>
  getApplicantStatus(applicantId: string): Promise<IApplicantStatusResponse>
  streamDocumentImage(inspectionId: string, imageId: number): Promise<(Readable & { total: number }) | null>
}

export const SumsubServiceSymbol = Symbol.for('ISumsubService')

@injectable()
export class SumsubService implements ISumsubService {
  private readonly logger: ILogger

  @inject(SumsubConfigSymbol) sumsubConfig!: ISumsubConfig

  @named('sumsub') @inject(HttpTransportSymbol) http!: IHttpTransport

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(SumsubService)
  }

  async createAccessToken(payload: AccessTokenRequest): Promise<AccessTokenResponse> {
    try {
      const path = `/resources/accessTokens`
      const queryParams: Record<string, string> = {
        userId: payload.userId,
        levelName: payload.levelName,
      }

      const headers = await this.generateHeaders('post', path, this.sumsubConfig, queryParams)
      const response = await this.http.post(path, {
        qs: queryParams,
        headers: headers,
        Model: AccessTokenResponse,
      })

      this.logger.info(`Created Sumsub access token for user [${payload.userId}] and level [${payload.levelName}]`)

      return response
    } catch (err) {
      this.logger.error(
        `Sumsub access token request failed for user [${payload.userId}] and level [${payload.levelName}]`,
      )

      throw err
    }
  }

  async getApplicantData(applicantId: string): Promise<ApplicantDataResponse> {
    try {
      const path = `/resources/applicants/${applicantId}/one`
      const headers = await this.generateHeaders('get', path, this.sumsubConfig)
      const response = await this.http.get(path, {
        headers: headers,
        Model: ApplicantDataResponse,
      })

      return response
    } catch (err) {
      this.logger.error(`Applicant data request failed for user with applicant ID [${applicantId}]`)

      throw err
    }
  }

  async getApplicantStatus(applicantId: string): Promise<IApplicantStatusResponse> {
    try {
      const path = `/resources/applicants/${applicantId}/requiredIdDocsStatus`
      const headers = await this.generateHeaders('get', path, this.sumsubConfig)

      return await this.http.get<IApplicantStatusResponse>(path, {
        headers: headers,
      })
    } catch (err) {
      this.logger.error(`Applicant status request failed for user with applicant ID [${applicantId}]`)

      throw err
    }
  }

  async streamDocumentImage(inspectionId: string, imageId: number): Promise<(Readable & { total: number }) | null> {
    const path = `/resources/inspections/${inspectionId}/resources/${imageId}`
    const headers = await this.generateHeaders('get', path, this.sumsubConfig)

    return this.http.stream('GET', path, {
      headers: headers,
    })
  }

  /**
   * Use this method to generate the Sumsub headers needed to authenticate a request
   * @param method - The HTTP method name in upper-case, e.g. GET or POST
   * @param path - The path of the request without the host name or query string
   * @param sumsubConfig - The Sumsub doppler configs, needed for the API token and secret keys
   * @param queryParams - The object of query params, will be used to form the full URI (path + query params)
   * @param data - The body object of the request
   * @returns A record object of all headers and values
   */
  private async generateHeaders(
    method: string,
    path: string,
    sumsubConfig: ISumsubConfig,
    queryParams?: Record<string, string> | null,
    data?: Record<string, string> | null,
  ): Promise<Record<string, string>> {
    const ts = Math.floor(Date.now() / 1000)

    let uri = path
    if (queryParams) {
      const queryString = '?' + new URLSearchParams(queryParams).toString()
      uri += queryString
    }

    const signature = crypto.createHmac('sha256', sumsubConfig.apiSecret)
    signature.update(ts + method.toUpperCase() + uri)

    if (data) {
      signature.update(JSON.stringify(data))
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-Token': sumsubConfig.apiToken,
      'X-App-Access-Ts': ts.toString(),
      'X-App-Access-Sig': signature.digest('hex'),
    }

    return headers
  }
}

// TODO: later
// type DocumentImageStream = {
//   contentType: string
//   contentSize: number
//   stream: (Readable & { total: number }) | null
// }
