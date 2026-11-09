2021

import { inject, injectable } from 'inversify'
import crypto from 'crypto'
import * as assert from 'assert'
import { IConfig } from 'config'
import { Readable } from 'stream'

import { ILogger, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ConfigSymbol } from '@ts-awesome/config'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'

import {
  IUserEntityService,
  IUserKYCProviderVerificationEntityService,
  UserEntityServiceSymbol,
  UserKYCProviderVerificationEntityServiceSymbol,
} from '../../../models/db'
import { IApplicantStatusResponse, IdDocType, StatusColor } from '../../../models/sumsub/applicant-status.response'
import { ApplicantDataResponse } from '../../../models/sumsub'

import { ISumsubService, SumsubServiceSymbol } from '../../sumsub.service'
import { IdentityConfigSymbol, IIdentityConfig } from '../../../models/config'

export interface IIdentityService {
  getIdentityDocumentInfo(userId: number): Promise<IdentityInfo | null>
  createIdentityDocumentUrl(userId: number, payload: IdentityDocumentPayload): Promise<string>
  streamDocumentPicture(encryptedPayload: string): Promise<(Readable & { total: number }) | null>
}

export const IdentityServiceSymbol = Symbol.for('IIdentityService')

@injectable()
export class IdentityService implements IIdentityService {
  @inject(ConfigSymbol) config!: IConfig
  @inject(IdentityConfigSymbol) identityConfig!: IIdentityConfig

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserKYCProviderVerificationEntityServiceSymbol)
  userKYCVerificationService!: IUserKYCProviderVerificationEntityService
  @inject(SumsubServiceSymbol) sumsubService!: ISumsubService

  private logger: ILogger

  private get documentUrlSecret() {
    return this.identityConfig.documentUrlSecret
  }

  private get documentUrlSalt() {
    return 'salt'
  }

  private hashAlgo = 'sha512'
  private cipherAlgo = 'aes-256-cbc'

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(IdentityService)
  }

  async getIdentityDocumentInfo(userId: number): Promise<IdentityInfo | null> {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      this.logger.error(`unexpected: user must exist. id:${userId}`)
      return null
    }

    const kycVerification = await this.userKYCVerificationService.getOne({ userId: user.id })
    if (!kycVerification) {
      this.logger.error(`unexpected: KYC Verification must exist. ${userId}`)
      return null
    }

    let applicant: ApplicantDataResponse
    let applicantStatus: IApplicantStatusResponse
    try {
      ;[applicant, applicantStatus] = await Promise.all([
        this.sumsubService.getApplicantData(kycVerification.providerApplicantId),
        this.sumsubService.getApplicantStatus(kycVerification.providerApplicantId),
      ])
    } catch (err: any) {
      this.logger.error(err)
      return null
    }

    // TODO: refactor
    const identity = applicantStatus.IDENTITY.idDocType
    const idDoc: any = (applicant.info.idDocs ?? []).find((x: any) => x.idDocType === identity)

    if (idDoc) {
      const docType: IdDocType = idDoc.idDocType
      const docNo: string = idDoc.number

      if (docType && docNo) {
        return {
          type: docType,
          no: docNo,
        }
      } else {
        return null
      }
    } else {
      return null
    }
  }

  async createIdentityDocumentUrl(userId: number, payload: IdentityDocumentPayload): Promise<string> {
    const domain = this.config.get<string>('domain')

    const user = await this.userEntityService.getOne({ id: userId })
    assert.ok(user)

    const secretPayload = JSON.stringify({
      ...payload,
      user: user.uid,
      version: 'v1',
      type: payload.type,
    })
    const encryptedPayload = this.encrypt(secretPayload, this.documentUrlSalt)

    return `https://${domain}/api/v1/user/identity/document?payload=${encryptedPayload}`
  }

  async streamDocumentPicture(encryptedPayload: string): Promise<(Readable & { total: number }) | null> {
    const secretPayload = this.decrypt(encryptedPayload, this.documentUrlSalt)
    const payload: SecretPayload = JSON.parse(secretPayload)

    const user = await this.userEntityService.getOne({ uid: payload.user })
    assert.ok(user, `User must exist. ${payload}`)

    const kycVerification = await this.userKYCVerificationService.getOne({ userId: user.id })
    assert.ok(kycVerification, `KYC Verification must exist. ${payload}`)

    const [applicant, applicantStatus] = await Promise.all([
      this.sumsubService.getApplicantData(kycVerification.providerApplicantId),
      this.sumsubService.getApplicantStatus(kycVerification.providerApplicantId),
    ])
    assert.ok(applicant.inspectionId, `Inspection ID must be defined. ${payload}`)

    const identity = payload.type === 'selfie' ? applicantStatus.SELFIE : applicantStatus.IDENTITY
    const greenImageId = identity.imageIds.find(x => identity.imageReviewResults[x].reviewAnswer === StatusColor.Green)

    return this.sumsubService.streamDocumentImage(applicant.inspectionId, greenImageId!)
  }

  private encrypt(data: string, salt: string) {
    // key length for aes-256 is 32 bytes
    const key = crypto.createHash(this.hashAlgo).update(this.documentUrlSecret).digest('hex').substring(0, 32)

    // block length for aes0256 is 16 bytes
    const initVector = crypto.createHash('sha512').update(salt).digest('hex').substring(0, 16)

    const cipher = crypto.createCipheriv(this.cipherAlgo, key, initVector)
    let encryptedData = cipher.update(data, 'utf8', 'hex')
    encryptedData += cipher.final('hex')

    return encryptedData
  }

  private decrypt(data: string, salt: string) {
    // key length for aes-256 is 32 bytes
    const key = crypto.createHash(this.hashAlgo).update(this.documentUrlSecret).digest('hex').substring(0, 32)

    // block length for aes-256 is 16 bytes
    const initVector = crypto.createHash('sha512').update(salt).digest('hex').substring(0, 16)

    const decipher = crypto.createDecipheriv(this.cipherAlgo, key, initVector)
    let decryptedData = decipher.update(data, 'hex', 'utf8')
    decryptedData += decipher.final('utf8')

    return decryptedData
  }
}

type IdentityDocumentPayload = {
  requester: string
  type: 'selfie' | 'identity'
}

type SecretPayload = {
  version: 'v1'
  requester: string
  user: string
  type?: 'selfie' | 'identity'
}

type IdentityInfo = {
  type: IdDocType
  no: string
}
