import { readable } from '@ts-awesome/model-reader'

export enum RequiredIdDoc {
  Identity = 'IDENTITY',
  Selfie = 'SELFIE',
}

export enum StatusColor {
  Green = 'GREEN',
  Red = 'RED',
}

export enum IdDocType {
  IDCard = 'ID_CARD',
  Passport = 'PASSPORT',
  DriverLicence = 'DRIVERS',
  ResidencePermit = 'RESIDENCE_PERMIT',
  Selfie = 'SELFIE',
}

class IReviewResult {
  @readable reviewAnswer!: StatusColor
}

interface IDocumentStatus {
  reviewResult: IReviewResult
  country: string
  idDocType: IdDocType
  imageIds: number[]
  imageReviewResults: Record<number, IReviewResult>
  forbidden: boolean
}

export type IApplicantStatusResponse = Record<RequiredIdDoc, IDocumentStatus>
